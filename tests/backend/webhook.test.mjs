import { test, mock, after } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import path from 'node:path';

const root = fileURLToPath(new URL('../..', import.meta.url));
const url = (p) => pathToFileURL(path.join(root, p)).href;
const SECRET = 'whsec_test_secret';
const PORT = 5098;

process.env.STRIPE_SK = 'sk_test_fake';
process.env.STRIPE_WEBHOOK_SECRET = SECRET;
process.env.DOMAIN = 'https://app.example';
process.env.FIREBASE_PROJECT_ID = 'demo-test';
process.env.PORT = String(PORT);

// Real Stripe library, so signatures are genuinely verified.
const Stripe = createRequire(path.join(root, 'package.json'))('stripe');
const stripe = new Stripe('sk_test_fake');

let store; let failTransaction = false;
const reset = () => {
  failTransaction = false;
  store = {
    'products/multi': { status: 'Available', product_quantity: '3', name: 'Pens' },
    'products/last': { status: 'Available', product_quantity: 1, name: 'Lamp' },
    'products/gone': { status: 'Sold', product_quantity: 0, name: 'Desk' },
  };
};
const ref = (c) => (id) => ({ key: `${c}/${id}` });
const db = {
  collection: (c) => ({ doc: ref(c) }),
  runTransaction: async (fn) => {
    if (failTransaction) throw new Error('firestore down');
    await fn({
      get: async (r) => ({ exists: r.key in store, data: () => store[r.key] }),
      set: (r, d) => { store[r.key] = d; },
      update: (r, d) => { store[r.key] = { ...store[r.key], ...d }; },
    });
  },
};
mock.module(url('stripe-backend/config/clients.js'), {
  namedExports: { db, stripe, adminAuth: { verifyIdToken: async () => { throw new Error('bad'); } } },
});
const { server } = await import(url('stripe-backend/server.js'));
after(() => { server.closeAllConnections(); server.close(); });

const session = (over = {}) => ({
  id: 'cs_1', payment_status: 'paid', amount_total: 1250, currency: 'eur', payment_intent: 'pi_1',
  metadata: { productId: 'multi', buyerUid: 'buyer', sellerUid: 'seller', platformFeeCents: '100' },
  ...over,
});
// Signed with Stripe's own library, so this also checks HookGuard against real Stripe headers.
const send = (object, { type = 'checkout.session.completed', secret = SECRET, timestamp, tamper } = {}) => {
  const payload = JSON.stringify({ id: 'evt_1', object: 'event', type, data: { object } });
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret, timestamp });
  const body = tamper ? payload.replace('"amount_total":1250', '"amount_total":1') : payload;
  return fetch(`http://localhost:${PORT}/api/stripe/webhook`, {
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

test('paid session records the order and reduces quantity', async () => {
  reset();
  assert.equal(await send(session()), 200);
  const o = store['orders/cs_1'];
  assert.equal(o.status, 'paid');
  assert.equal(o.sellerUid, 'seller');
  assert.equal(o.amountCents, 1250);
  assert.equal(o.platformFeeCents, 100);
  assert.equal(o.productName, 'Pens');
  assert.equal(store['products/multi'].product_quantity, 2);
  assert.equal(store['products/multi'].status, 'Available');
});

test('Stripe retry of the same session does not double count', async () => {
  reset();
  await send(session()); await send(session()); await send(session());
  assert.equal(store['products/multi'].product_quantity, 2);
});

test('last unit marks the listing Sold', async () => {
  reset();
  await send(session({ metadata: { ...session().metadata, productId: 'last' } }));
  assert.equal(store['products/last'].status, 'Sold');
  assert.equal(store['products/last'].product_quantity, 0);
});

test('already-sold item becomes needs_refund', async () => {
  reset();
  assert.equal(await send(session({ metadata: { ...session().metadata, productId: 'gone' } })), 200);
  assert.equal(store['orders/cs_1'].status, 'needs_refund');
  assert.equal(store['products/gone'].product_quantity, 0);
});

test('deleted product becomes needs_refund without writing the product', async () => {
  reset();
  assert.equal(await send(session({ metadata: { ...session().metadata, productId: 'nope' } })), 200);
  assert.equal(store['orders/cs_1'].status, 'needs_refund');
  assert.equal(store['products/nope'], undefined);
});

test('unpaid session, other events, and foreign sessions record nothing', async () => {
  reset();
  assert.equal(await send(session({ payment_status: 'unpaid' })), 200);
  assert.equal(await send(session(), { type: 'checkout.session.expired' }), 200);
  assert.equal(await send(session({ metadata: {} })), 200);
  assert.equal(store['orders/cs_1'], undefined);
  assert.equal(store['products/multi'].product_quantity, '3');
});

test('database failure returns 500 so Stripe retries', async () => {
  reset(); failTransaction = true;
  assert.equal(await send(session()), 500);
});

test('JSON routes still work beside the raw webhook route', async () => {
  const r = await fetch(`http://localhost:${PORT}/api/stripe/create-checkout-session`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"productId":"x"}',
  });
  assert.equal(r.status, 401);
});
