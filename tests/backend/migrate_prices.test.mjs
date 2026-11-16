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
  ['hex', '0x10'], ['exp', '1e3'], ['comma', '12,50'], ['nan', NaN], ['zero', 0], ['neg', -5],
  ['round', '1.005'], ['big', '99999999'],
].map(([id, price]) => ({ id, ref: id, updateTime: `t-${id}`, data: () => ({ price }) }));
const commits = [];
const db = {
  collection: () => ({ get: async () => ({ size: docs.length, forEach: (fn) => docs.forEach(fn) }) }),
  batch: () => {
    const ops = [];
    return { update: (ref, d, pre) => ops.push([ref, d, pre]), commit: async () => commits.push(ops) };
  },
};
mock.module(url('stripe-backend/config/clients.js'), { namedExports: { db, stripe: {}, adminAuth: {} } });

const captureLogs = async (fn) => {
  const lines = []; const original = console.log;
  console.log = (l) => lines.push(l);
  try { await fn(); } finally { console.log = original; }
  return lines;
};

test('migration dry run writes nothing and flags every invalid price', async () => {
  process.argv = process.argv.filter((a) => a !== '--apply');
  process.exitCode = 0;
  const lines = await captureLogs(() => import(`${url('stripe-backend/scripts/migrate_prices.js')}?dry`));
  assert.equal(commits.length, 0);
  assert.equal(lines[0], 'Would update 3 of 14 products.');
  assert.match(lines[1], /Left 10 products/);
  const flagged = lines.slice(2).map((l) => l.trim().split(':')[0]);
  assert.deepEqual(flagged, ['c', 'd', 'e', 'hex', 'exp', 'nan', 'zero', 'neg', 'round', 'big']);
  assert.equal(process.exitCode, 1);
  process.exitCode = 0;
});

test('migration --apply converts plain decimals only, with update-time preconditions', async () => {
  process.argv.push('--apply');
  await captureLogs(() => import(`${url('stripe-backend/scripts/migrate_prices.js')}?apply`));
  assert.deepEqual(commits, [[
    ['a', { price: 12.5 }, { lastUpdateTime: 't-a' }],
    ['f', { price: 7 }, { lastUpdateTime: 't-f' }],
    ['comma', { price: 12.5 }, { lastUpdateTime: 't-comma' }],
  ]]);
  process.exitCode = 0;
});

test('toNumber parses cents as integers', async () => {
  let mod;
  await captureLogs(async () => { mod = await import(`${url('stripe-backend/scripts/migrate_prices.js')}?unit`); });
  const { toNumber } = mod;
  assert.equal(toNumber('1.1'), 1.1);
  assert.equal(toNumber('0,5'), 0.5);
  assert.equal(toNumber('9999999.99'), 9999999.99);
  assert.equal(toNumber('10000000'), null);
  assert.equal(toNumber('-1'), null);
  assert.equal(toNumber('1.'), null);
  process.exitCode = 0;
});
