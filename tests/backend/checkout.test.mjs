import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../..', import.meta.url));
const url = (p) => pathToFileURL(path.join(root, p)).href;

process.env.STRIPE_SK = 'sk_test_fake';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_x';
process.env.DOMAIN = 'https://app.example/some/path';
process.env.FIREBASE_PROJECT_ID = 'demo-test';

const data = {
  products: {
    good: { status: 'Available', soldBy: 'seller', price: '12.50', name: 'Lamp', description: '  ' },
    numeric: { status: 'Available', soldBy: 'seller', price: 20, name: 'Desk', description: 'Oak' },
    sold: { status: 'Sold', soldBy: 'seller', price: '5.00', name: 'x' },
    nan: { status: 'Available', soldBy: 'seller', price: 'NaN', name: 'x' },
    cheap: { status: 'Available', soldBy: 'seller', price: '1.00', name: 'x' },
    noacct: { status: 'Available', soldBy: 'plain', price: '5.00', name: 'x' },
    badacct: { status: 'Available', soldBy: 'forged', price: '5.00', name: 'x' },
    mine: { status: 'Available', soldBy: 'buyer', price: '5.00', name: 'x' },
  },
  users: {
    seller: { sellerStripeAccountId: 'acct_REAL123' },
    plain: {},
    forged: { sellerStripeAccountId: 'not-an-account' },
  },
};

const calls = [];
const db = {
  collection: (c) => ({
    doc: (id) => ({
      get: async () => ({ exists: id in data[c], data: () => data[c][id] }),
    }),
  }),
};
const stripe = {
  checkout: { sessions: { create: async (args) => { calls.push(args); return { url: 'https://stripe.test/s' }; } } },
};

mock.module(url('stripe-backend/config/clients.js'), { namedExports: { db, stripe, adminAuth: {} } });
const { handleCreateCheckout } = await import(url('stripe-backend/controllers/stripe_controller.js'));

const run = async (body) => {
  const out = {};
  const res = {
    status(c) { out.status = c; return this; },
    json(b) { out.body = b; out.status ??= 200; return this; },
  };
  await handleCreateCheckout({ body, user: { uid: 'buyer' } }, res);
  return out;
};

test('ignores client price and account; uses Firestore values', async () => {
  calls.length = 0;
  const r = await run({ productId: 'good', price: 0.01, sellerStripeAccountId: 'acct_ATTACKER', title: 'free' });
  assert.equal(r.status, 200);
  const s = calls[0];
  assert.equal(s.line_items[0].price_data.unit_amount, 1250);
  assert.equal(s.payment_intent_data.transfer_data.destination, 'acct_REAL123');
  assert.equal(s.line_items[0].price_data.product_data.name, 'Lamp');
  assert.equal(s.line_items[0].price_data.product_data.description, undefined);
  assert.equal(s.success_url, 'https://app.example/success.html');
  assert.deepEqual(s.metadata, { productId: 'good', buyerUid: 'buyer', sellerUid: 'seller', platformFeeCents: '100' });
  const window = s.expires_at - Math.floor(Date.now() / 1000);
  assert.ok(window >= 30 * 60 && window <= 32 * 60);
});

test('numeric price works', async () => {
  calls.length = 0;
  assert.equal((await run({ productId: 'numeric' })).status, 200);
  assert.equal(calls[0].line_items[0].price_data.unit_amount, 2000);
});

for (const [name, body, status] of [
  ['no body', undefined, 400],
  ['non-string id', { productId: { a: 1 } }, 400],
  ['path id', { productId: 'a/b' }, 400],
  ['unknown', { productId: 'missing' }, 404],
  ['sold', { productId: 'sold' }, 409],
  ['own listing', { productId: 'mine' }, 403],
  ['NaN price', { productId: 'nan' }, 422],
  ['price not above fee', { productId: 'cheap' }, 422],
  ['seller without account', { productId: 'noacct' }, 422],
  ['malformed account', { productId: 'badacct' }, 422],
]) {
  test(`rejects: ${name}`, async () => {
    calls.length = 0;
    const r = await run(body);
    assert.equal(r.status, status);
    assert.equal(calls.length, 0);
  });
}
