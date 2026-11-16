import { db, stripe } from '../config/clients.js';
import { env } from '../config/env.js';
import { platformFeeCents } from '../services/fees.js';
import { available, releaseUnit, reserveUnit } from '../services/inventory.js';

const CHECKOUT_WINDOW_SECONDS = 31 * 60;
// Stripe's smallest charge in most currencies.
const MIN_CHARGE_CENTS = 50;
const PRODUCT_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const STRIPE_ACCOUNT_PATTERN = /^acct_[A-Za-z0-9]+$/;

// Answers with the first problem found, or null when the listing can be bought.
const rejection = (product, buyerUid) => {
  if (!product) return [404, 'Product not found'];
  if (product.status !== 'Available') return [409, 'This product is no longer available'];
  if (!product.soldBy) return [422, 'This product has no seller'];
  if (product.soldBy === buyerUid) return [403, 'You cannot buy your own listing'];
  if (available(product) < 1) return [409, 'This product is no longer available'];
  return null;
};

export const handleCreateCheckout = async (req, res) => {
  // productId is the only client input. Price and payout account come from Firestore.
  const productId = req.body?.productId;

  if (typeof productId !== 'string' || !PRODUCT_ID_PATTERN.test(productId)) {
    return res.status(400).json({ error: 'A valid productId is required' });
  }

  const productSnapshot = await db.collection('products').doc(productId).get();
  const product = productSnapshot.exists ? productSnapshot.data() : null;

  const rejected = rejection(product, req.user.uid);
  if (rejected) return res.status(rejected[0]).json({ error: rejected[1] });

  // Number() also covers listings that still store price as a string.
  const unitAmount = Math.round(Number(product.price) * 100);
  if (!Number.isSafeInteger(unitAmount) || unitAmount < MIN_CHARGE_CENTS) {
    return res.status(422).json({ error: 'This product cannot be purchased online' });
  }

  const feeCents = platformFeeCents(unitAmount);

  const seller = (await db.collection('users').doc(product.soldBy).get()).data();
  const sellerStripeAccountId = seller?.sellerStripeAccountId;

  if (typeof sellerStripeAccountId !== 'string' || !STRIPE_ACCOUNT_PATTERN.test(sellerStripeAccountId)
    || seller.stripeChargesEnabled !== true) {
    return res.status(422).json({ error: 'This seller cannot accept online payments yet' });
  }

  // Hold a unit for the length of the session. The transaction re-reads the
  // product, so a sale that landed since the check above is seen here.
  try {
    await reserveUnit(productId);
  } catch (error) {
    if (error.status === 409) return res.status(409).json({ error: error.message });
    throw error;
  }

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: env.currency,
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
        application_fee_amount: feeCents,
        transfer_data: {
          destination: sellerStripeAccountId,
        },
      },
      metadata: {
        productId,
        buyerUid: req.user.uid,
        sellerUid: product.soldBy,
        platformFeeCents: String(feeCents),
      },
      // Stripe's minimum. A shorter window leaves less time to oversell the item.
      expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_WINDOW_SECONDS,
      success_url: `${env.frontendOrigin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.frontendOrigin}/cancel.html?product=${encodeURIComponent(productId)}`,
    });
  } catch (error) {
    await releaseUnit(productId).catch((releaseError) => {
      console.error(`Could not release ${productId} after a failed session:`, releaseError);
    });
    console.error('Checkout error:', error.message);
    return res.status(502).json({ error: 'Stripe session creation failed' });
  }

  res.json({ url: session.url });
};
