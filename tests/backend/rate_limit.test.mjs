import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import { createRequire } from 'node:module';
const root = fileURLToPath(new URL('../..', import.meta.url));
const url = (p) => pathToFileURL(path.join(root, p)).href;
process.env.STRIPE_SK='sk_test_fake'; process.env.STRIPE_WEBHOOK_SECRET='whsec_x'; process.env.DOMAIN='https://app.example'; process.env.FIREBASE_PROJECT_ID='demo-test';
const adminAuth = { verifyIdToken: async (t) => ({ uid: t }) };
const db = { collection: () => ({ doc: () => ({ get: async () => ({ exists: false, data: () => undefined }) }) }) };
mock.module(url('stripe-backend/config/clients.js'), { namedExports: { db, stripe: {}, adminAuth } });
const express = createRequire(path.join(root, 'package.json'))('express');
const { default: routes } = await import(url('stripe-backend/routes/stripe.js'));
test('limits per user, not globally', async () => {
  const app = express(); app.use(express.json()); app.use('/api/stripe', routes);
  const server = await new Promise((r) => { const s = app.listen(0, () => r(s)); });
  const post = (uid) => fetch(`http://localhost:${server.address().port}/api/stripe/create-checkout-session`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${uid}` }, body: '{"productId":"x"}' }).then((r) => r.status);
  const statuses = []; for (let i = 0; i < 11; i++) statuses.push(await post('alice'));
  server.close();
  assert.deepEqual(statuses.slice(0, 10), Array(10).fill(404));
  assert.equal(statuses[10], 429);
});
