import { HookGuard } from '@efrata/hookguard';
import { db, stripe } from '../config/clients.js';
import { env } from '../config/env.js';
import { releaseUnit } from '../services/inventory.js';
import { reportWebhookError, webhookEventStore } from '../services/webhook_store.js';

const orderRef = (sessionId) => db.collection('orders').doc(sessionId);
const productRef = (productId) => db.collection('products').doc(productId);

// Records the order once and consumes the unit that was reserved at checkout.
// The order id is the Checkout Session id, so Stripe's retries of the same
// event cannot record a sale twice. Returns the order when it needs a refund.
const recordOrder = async (session) => {
  const { productId, buyerUid, sellerUid, platformFeeCents } = session.metadata ?? {};

  if (!productId) {
    console.warn(`Ignoring session ${session.id}: it has no productId`);
    return null;
  }

  return db.runTransaction(async (transaction) => {
    const orderSnapshot = await transaction.get(orderRef(session.id));
    if (orderSnapshot.exists) return null;

    const product = (await transaction.get(productRef(productId))).data();
    const remaining = Number(product?.product_quantity);
    const reserved = Number(product?.reserved) || 0;
    const canFulfil = product?.status === 'Available' && remaining >= 1;

    const order = {
      productId,
      productName: product?.name ?? 'Unavailable product',
      buyerUid,
      sellerUid,
      amountCents: session.amount_total,
      platformFeeCents: Number(platformFeeCents),
      currency: session.currency,
      paymentIntent: session.payment_intent,
      livemode: env.livemode,
      status: canFulfil ? 'paid' : 'needs_refund',
      createdAt: new Date(),
    };
    transaction.set(orderRef(session.id), order);

    if (canFulfil) {
      transaction.update(productRef(productId), {
        reserved: Math.max(reserved - 1, 0),
        ...(remaining > 1
          ? { product_quantity: remaining - 1 }
          : { product_quantity: 0, status: 'Sold' }),
      });
    } else if (product && reserved > 0) {
      transaction.update(productRef(productId), { reserved: reserved - 1 });
    }

    return canFulfil ? null : order;
  });
};

// The buyer paid for a unit that was gone by the time the webhook arrived.
// Reverse the transfer to the seller and the platform fee along with the refund.
const refundOrder = async (sessionId, order) => {
  const refund = await stripe.refunds.create({
    payment_intent: order.paymentIntent,
    reverse_transfer: true,
    refund_application_fee: true,
    metadata: { orderId: sessionId, reason: 'product_unavailable' },
  });
  await orderRef(sessionId).update({ status: 'refunded', refundId: refund.id, refundedAt: new Date() });
};

const markOrderByPaymentIntent = async (paymentIntent, patch) => {
  if (typeof paymentIntent !== 'string') return;
  const matches = await db.collection('orders').where('paymentIntent', '==', paymentIntent).limit(1).get();
  if (matches.empty) return;
  await matches.docs[0].ref.update(patch);
};

const guardOptions = (secret) => ({
  providers: { stripe: { secret } },
  idempotency: webhookEventStore,
  onError: reportWebhookError,
});

// HookGuard verifies the Stripe signature and timestamp, answers 401 to
// forged or stale requests, and returns 500 when a handler throws so Stripe
// retries the event.
const guard = new HookGuard(guardOptions(env.stripeWebhookSecret));

const sameMode = (event) => {
  if (event.payload.livemode === env.livemode) return true;
  console.warn(`Ignoring ${event.payload.livemode ? 'live' : 'test'} event ${event.id} on a ${env.livemode ? 'live' : 'test'} server`);
  return false;
};

guard.on('stripe', 'checkout.session.completed', async (event) => {
  if (!sameMode(event)) return;
  const session = event.payload.data.object;
  if (session.payment_status !== 'paid') return;

  const unfulfilled = await recordOrder(session);
  if (unfulfilled) await refundOrder(session.id, unfulfilled);
});

guard.on('stripe', 'checkout.session.expired', async (event) => {
  if (!sameMode(event)) return;
  const { productId } = event.payload.data.object.metadata ?? {};
  if (productId) await releaseUnit(productId);
});

guard.on('stripe', 'charge.refunded', async (event) => {
  if (!sameMode(event)) return;
  const charge = event.payload.data.object;
  await markOrderByPaymentIntent(charge.payment_intent, {
    status: charge.refunded ? 'refunded' : 'partially_refunded',
    refundedAt: new Date(),
  });
});

guard.on('stripe', 'charge.dispute.created', async (event) => {
  if (!sameMode(event)) return;
  const dispute = event.payload.data.object;
  await markOrderByPaymentIntent(dispute.payment_intent, { status: 'disputed', disputeId: dispute.id });
});

export const handleStripeWebhook = guard.middleware('stripe');

// Connect account events use a separate endpoint and signing secret. Without
// the secret the route is not mounted at all (see server.js).
const updateSellerAccount = async (account) => {
  const mapping = await db.collection('stripe_accounts').doc(account.id).get();
  const uid = mapping.data()?.uid;
  if (!uid) {
    console.warn(`account.updated for unknown account ${account.id}`);
    return;
  }
  await db.collection('users').doc(uid).update({
    stripeChargesEnabled: account.charges_enabled === true,
    stripePayoutsEnabled: account.payouts_enabled === true,
    stripeRequirementsDue: account.requirements?.currently_due ?? [],
  });
};

export const handleStripeConnectWebhook = env.stripeConnectWebhookSecret
  ? (() => {
    const connectGuard = new HookGuard(guardOptions(env.stripeConnectWebhookSecret));
    connectGuard.on('stripe', 'account.updated', async (event) => {
      if (!sameMode(event)) return;
      await updateSellerAccount(event.payload.data.object);
    });
    return connectGuard.middleware('stripe');
  })()
  : null;
