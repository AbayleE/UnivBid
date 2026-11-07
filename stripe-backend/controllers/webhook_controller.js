import { HookGuard } from '@efrata/hookguard';
import { db } from '../config/clients.js';
import { env } from '../config/env.js';

// The order id is the Checkout Session id, so Stripe's retries of the same
// event cannot record a sale twice.
const recordOrder = async (session) => {
  const { productId, buyerUid, sellerUid, platformFeeCents } = session.metadata ?? {};

  if (!productId) {
    console.warn(`Ignoring session ${session.id}: it has no productId`);
    return;
  }

  const orderRef = db.collection('orders').doc(session.id);
  const productRef = db.collection('products').doc(productId);

  await db.runTransaction(async (transaction) => {
    const orderSnapshot = await transaction.get(orderRef);
    const productSnapshot = await transaction.get(productRef);

    if (orderSnapshot.exists) return;

    const product = productSnapshot.data();
    const remaining = Number(product?.product_quantity);
    const canFulfil = product?.status === 'Available' && remaining >= 1;

    if (!canFulfil) {
      console.error(`Order ${session.id} needs a refund: product ${productId} is unavailable`);
    }

    transaction.set(orderRef, {
      productId,
      productName: product?.name ?? 'Unavailable product',
      buyerUid,
      sellerUid,
      amountCents: session.amount_total,
      platformFeeCents: Number(platformFeeCents),
      currency: session.currency,
      paymentIntent: session.payment_intent,
      status: canFulfil ? 'paid' : 'needs_refund',
      createdAt: new Date(),
    });

    if (canFulfil) {
      transaction.update(productRef, remaining > 1
        ? { product_quantity: remaining - 1 }
        : { product_quantity: 0, status: 'Sold' });
    }
  });
};

// HookGuard verifies the Stripe signature and timestamp, answers 401 to
// forged or stale requests, and returns 500 when a handler throws so Stripe
// retries the event.
const guard = new HookGuard({
  providers: {
    stripe: { secret: env.stripeWebhookSecret },
  },
});

guard.on('stripe', 'checkout.session.completed', async (event) => {
  const session = event.payload.data.object;
  if (session.payment_status === 'paid') {
    await recordOrder(session);
  }
});

export const handleStripeWebhook = guard.middleware('stripe');
