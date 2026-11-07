import { db, stripe } from '../config/clients.js';
import { env } from '../config/env.js';

const PLATFORM_FEE_CENTS = 100;
const CHECKOUT_WINDOW_SECONDS = 31 * 60;
const PRODUCT_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const STRIPE_ACCOUNT_PATTERN = /^acct_[A-Za-z0-9]+$/;

export const handleCreateCheckout = async (req, res) => {
  try {
    // productId is the only client input. Price and payout account come from Firestore.
    const productId = req.body?.productId;

    if (typeof productId !== 'string' || !PRODUCT_ID_PATTERN.test(productId)) {
      return res.status(400).json({ error: 'A valid productId is required' });
    }

    const productSnapshot = await db.collection('products').doc(productId).get();
    if (!productSnapshot.exists) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = productSnapshot.data();

    if (product.status !== 'Available') {
      return res.status(409).json({ error: 'This product is no longer available' });
    }

    if (!product.soldBy) {
      return res.status(422).json({ error: 'This product has no seller' });
    }

    if (product.soldBy === req.user.uid) {
      return res.status(403).json({ error: 'You cannot buy your own listing' });
    }

    // Number() also covers listings that still store price as a string.
    const unitAmount = Math.round(Number(product.price) * 100);
    if (!Number.isSafeInteger(unitAmount) || unitAmount <= PLATFORM_FEE_CENTS) {
      return res.status(422).json({ error: 'This product cannot be purchased online' });
    }

    const sellerSnapshot = await db.collection('users').doc(product.soldBy).get();
    const sellerStripeAccountId = sellerSnapshot.data()?.sellerStripeAccountId;

    if (typeof sellerStripeAccountId !== 'string' || !STRIPE_ACCOUNT_PATTERN.test(sellerStripeAccountId)) {
      return res.status(422).json({ error: 'This seller cannot accept online payments yet' });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: product.name || 'UnivBid listing',
            // Stripe rejects an empty description.
            description: product.description?.trim() || undefined,
          },
          unit_amount: unitAmount,
        },
        quantity: 1,
      }],
      payment_intent_data: {
        application_fee_amount: PLATFORM_FEE_CENTS,
        transfer_data: {
          destination: sellerStripeAccountId,
        },
      },
      metadata: {
        productId,
        buyerUid: req.user.uid,
        sellerUid: product.soldBy,
        platformFeeCents: String(PLATFORM_FEE_CENTS),
      },
      // Stripe's minimum. A shorter window leaves less time to oversell the item.
      expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_WINDOW_SECONDS,
      success_url: `${env.frontendOrigin}/success.html`,
      cancel_url: `${env.frontendOrigin}/cancel.html`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error.message);
    res.status(500).json({ error: 'Stripe session creation failed' });
  }
};
