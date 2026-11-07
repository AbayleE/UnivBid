import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../..', import.meta.url));
const url = (p) => pathToFileURL(path.join(root, p)).href;

process.env.STRIPE_SK = 'sk_test_fake';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_x';
process.env.DOMAIN = 'https://app.example';
process.env.FIREBASE_PROJECT_ID = 'demo-test';

// Migration
const docs = [
  ['a', '12.50'], ['b', 20], ['c', 'NaN'], ['d', '0.00'], ['e', undefined], ['f', ' 7.00 '],
].map(([id, price]) => ({ id, ref: id, data: () => ({ price }) }));
const commits = [];
const db = {
  collection: () => ({ get: async () => ({ size: docs.length, forEach: (fn) => docs.forEach(fn) }) }),
  batch: () => {
    const ops = [];
    return { update: (ref, d) => ops.push([ref, d]), commit: async () => commits.push(ops) };
  },
};
mock.module(url('stripe-backend/config/clients.js'), { namedExports: { db, stripe: {}, adminAuth: {} } });

const captureLogs = async (fn) => {
  const lines = []; const original = console.log;
  console.log = (l) => lines.push(l);
  try { await fn(); } finally { console.log = original; }
  return lines;
};

test('migration dry run writes nothing', async () => {
  process.argv = process.argv.filter((a) => a !== '--apply');
  const lines = await captureLogs(() => import(`${url('stripe-backend/scripts/migrate_prices.js')}?dry`));
  assert.equal(commits.length, 0);
  assert.equal(lines[0], 'Would update 2 of 6 products.');
  assert.match(lines[1], /Left 3 products/);
});

test('migration --apply converts valid strings only', async () => {
  process.argv.push('--apply');
  await captureLogs(() => import(`${url('stripe-backend/scripts/migrate_prices.js')}?apply`));
  assert.deepEqual(commits, [[['a', { price: 12.5 }], ['f', { price: 7 }]]]);
});
