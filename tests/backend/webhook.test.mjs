import { test, mock, after } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import path from 'node:path';

const root = fileURLToPath(new URL('../..', import.meta.url));
const url = (p) => pathToFileURL(path.join(root, p)).href;
const SECRET = 'whsec_test_secret';
const CONNECT_SECRET = 'whsec_connect_secret';
const PORT = 5098;

process.env.STRIPE_SK = 'sk_test_fake';
process.env.STRIPE_WEBHOOK_SECRET = SECRET;
process.env.STRIPE_CONNECT_WEBHOOK_SECRET = CONNECT_SECRET;
process.env.DOMAIN = 'https://app.example';
process.env.FIREBASE_PROJECT_ID = 'demo-test';
process.env.PORT = String(PORT);

// Real Stripe library, so signatures are genuinely verified.
const Stripe = createRequire(path.join(root, 'package.json'))('stripe');
const stripeLib = new Stripe('sk_test_fake');

let store; let failTransaction = false; let refunds = [];
const reset = () => {
  failTransaction = false;
  refunds = [];
  store = {
    'products/multi': { status: 'Available', product_quantity: '3', reserved: 1, name: 'Pens' },
    'products/last': { status: 'Available', product_quantity: 1, reserved: 1, name: 'Lamp' },
    'products/gone': { status: 'Sold', product_quantity: 0, name: 'Desk' },
    'users/seller': { sellerStripeAccountId: 'acct_1', stripeChargesEnabled: false },
    'stripe_accounts/acct_1': { uid: 'seller' },
  };
};
const docRef = (key) => ({
  key,
  get: async () => ({ exists: key in store, data: () => store[key] }),
  update: async (d) => { store[key] = { ...store[key], ...d }; },
  delete: async () => { delete store[key]; },
  create: async (d) => {
    if (key in store) throw Object.assign(new Error('already exists'), { code: 6 });
    store[key] = d;
  },
});
const db = {
  collection: (c) => ({
    doc: (id) => docRef(`${c}/${id}`),
    where: (field, _op, value) => ({ limit: () => ({ get: async () => {
      const hits = Object.entries(store).filter(([k, v]) => k.startsWith(`${c}/`) && v[field] === value);
      return { empty: hits.length === 0, docs: hits.map(([k]) => ({ ref: docRef(k) })) };
    } }) }),
  }),
  runTransaction: async (fn) => {
    if (failTransaction) throw new Error('firestore down');
    return fn({
      get: async (r) => ({ exists: r.key in store, data: () => store[r.key] }),
      set: (r, d) => { store[r.key] = d; },
      update: (r, d) => { store[r.key] = { ...store[r.key], ...d }; },
    });
  },
};
const stripe = { refunds: { create: async (args) => { refunds.push(args); return { id: 're_1' }; } } };
mock.module(url('stripe-backend/config/clients.js'), {
  namedExports: { db, stripe, adminAuth: { verifyIdToken: async () => { throw new Error('bad'); } } },
});
const { server } = await import(url('stripe-backend/server.js'));
after(() => { server.closeAllConnections(); server.close(); });

let eventCounter = 0;
const session = (over = {}) => ({
  id: 'cs_1', payment_status: 'paid', amount_total: 1250, currency: 'eur', payment_intent: 'pi_1',
  metadata: { productId: 'multi', buyerUid: 'buyer', sellerUid: 'seller', platformFeeCents: '63' },
  ...over,
});
// Signed with Stripe's own library, so this also checks HookGuard against real Stripe headers.
const send = (object, {
  type = 'checkout.session.completed', secret = SECRET, timestamp, tamper, livemode = false,
  eventId = `evt_${++eventCounter}`, path = '/api/stripe/webhook',
} = {}) => {
  const payload = JSON.stringify({ id: eventId, object: 'event', type, livemode, data: { object } });
  const header = stripeLib.webhooks.generateTestHeaderString({ payload, secret, timestamp });
  const body = tamper ? payload.replace('"amount_total":1250', '"amount_total":1') : payload;
  return fetch(`http://localhost:${PORT}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'stripe-signature': header }, body,
  }).then((r) => r.status);
};

test('rejects a forged signature and writes nothing', async () => {
  reset();
  assert.equal(await send(session(), { secret: 'whsec_wrong' }), 401);
  assert.equal(store['orders/cs_1'], undefined);
  assert.equal(store['products/multi'].product_quantity, '3');
});

test('rejects a missing signature', async () => {
  reset();
  const status = await fetch(`http://localhost:${PORT}/api/stripe/webhook`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
  }).then((r) => r.status);
  assert.equal(status, 401);
});

test('rejects a replayed event with an old timestamp', async () => {
  reset();
  const anHourAgo = Math.floor(Date.now() / 1000) - 3600;
  assert.equal(await send(session(), { timestamp: anHourAgo }), 401);
  assert.equal(store['orders/cs_1'], undefined);
});

test('rejects a body changed after signing', async () => {
  reset();
  assert.equal(await send(session(), { tamper: true }), 401);
  assert.equal(store['orders/cs_1'], undefined);
});

test('paid session records the order, consumes the reservation and reduces quantity', async () => {
  reset();
  assert.equal(await send(session()), 200);
  const o = store['orders/cs_1'];
  assert.equal(o.status, 'paid');
  assert.equal(o.sellerUid, 'seller');
  assert.equal(o.amountCents, 1250);
  assert.equal(o.platformFeeCents, 63);
  assert.equal(o.productName, 'Pens');
  assert.equal(o.livemode, false);
  assert.equal(store['products/multi'].product_quantity, 2);
  assert.equal(store['products/multi'].reserved, 0);
  assert.equal(store['products/multi'].status, 'Available');
});

test('Stripe retry of the same event is claimed once and does not double count', async () => {
  reset();
  await send(session(), { eventId: 'evt_same' });
  await send(session(), { eventId: 'evt_same' });
  await send(session(), { eventId: 'evt_same' });
  assert.equal(store['products/multi'].product_quantity, 2);
  assert.ok(store['webhook_events/stripe:evt_same']);
});

test('a second event for the same session also does not double count', async () => {
  reset();
  await send(session());
  await send(session());
  assert.equal(store['products/multi'].product_quantity, 2);
});

test('last unit marks the listing Sold', async () => {
  reset();
  await send(session({ metadata: { ...session().metadata, productId: 'last' } }));
  assert.equal(store['products/last'].status, 'Sold');
  assert.equal(store['products/last'].product_quantity, 0);
});

test('already-sold item is refunded with the transfer reversed', async () => {
  reset();
  assert.equal(await send(session({ metadata: { ...session().metadata, productId: 'gone' } })), 200);
  assert.equal(store['orders/cs_1'].status, 'refunded');
  assert.equal(store['orders/cs_1'].refundId, 're_1');
  assert.deepEqual(refunds[0], {
    payment_intent: 'pi_1', reverse_transfer: true, refund_application_fee: true,
    metadata: { orderId: 'cs_1', reason: 'product_unavailable' },
  });
  assert.equal(store['products/gone'].product_quantity, 0);
});

test('unpaid session is ignored', async () => {
  reset();
  assert.equal(await send(session({ payment_status: 'unpaid' })), 200);
  assert.equal(store['orders/cs_1'], undefined);
});

test('an event from the other Stripe mode is ignored', async () => {
  reset();
  assert.equal(await send(session(), { livemode: true }), 200);
  assert.equal(store['orders/cs_1'], undefined);
});

test('expired session releases the reserved unit', async () => {
  reset();
  assert.equal(await send(session({ payment_status: 'unpaid' }), { type: 'checkout.session.expired' }), 200);
  assert.equal(store['products/multi'].reserved, 0);
  assert.equal(store['products/multi'].product_quantity, '3');
});

test('charge.refunded and disputes update the order status', async () => {
  reset();
  await send(session());
  await send({ id: 'ch_1', payment_intent: 'pi_1', refunded: true }, { type: 'charge.refunded' });
  assert.equal(store['orders/cs_1'].status, 'refunded');
  await send({ id: 'dp_1', payment_intent: 'pi_1' }, { type: 'charge.dispute.created' });
  assert.equal(store['orders/cs_1'].status, 'disputed');
  assert.equal(store['orders/cs_1'].disputeId, 'dp_1');
});

test('handler failure returns 500 and releases the event claim so Stripe retries', async () => {
  reset();
  failTransaction = true;
  assert.equal(await send(session(), { eventId: 'evt_fail' }), 500);
  assert.equal(store['orders/cs_1'], undefined);
  assert.equal(store['webhook_events/stripe:evt_fail'], undefined);
  failTransaction = false;
  assert.equal(await send(session(), { eventId: 'evt_fail' }), 200);
  assert.equal(store['orders/cs_1'].status, 'paid');
});

test('Connect endpoint uses its own secret and updates the seller profile', async () => {
  reset();
  const account = { id: 'acct_1', object: 'account', charges_enabled: true, payouts_enabled: false, requirements: { currently_due: ['x'] } };
  assert.equal(await send(account, { type: 'account.updated', path: '/api/stripe/connect/webhook', secret: SECRET }), 401);
  assert.equal(await send(account, { type: 'account.updated', path: '/api/stripe/connect/webhook', secret: CONNECT_SECRET }), 200);
  assert.equal(store['users/seller'].stripeChargesEnabled, true);
  assert.equal(store['users/seller'].stripePayoutsEnabled, false);
  assert.deepEqual(store['users/seller'].stripeRequirementsDue, ['x']);
});

test('unknown routes return JSON 404', async () => {
  const r = await fetch(`http://localhost:${PORT}/nope`);
  assert.equal(r.status, 404);
  assert.deepEqual(await r.json(), { error: 'Not found' });
});
