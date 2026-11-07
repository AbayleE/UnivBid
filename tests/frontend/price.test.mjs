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

const { parsePrice, formatPrice } = await import(url('Scripts/services/price.js'));

test('parsePrice', () => {
  assert.equal(parsePrice('12.5'), 12.5);
  assert.equal(parsePrice('12.345'), 12.35);
  assert.equal(parsePrice(7), 7);
  for (const bad of ['', '   ', 'abc', 'NaN', '-5', '0', '0.001', 'Infinity', '10000000', null, undefined]) {
    assert.equal(parsePrice(bad), null, String(bad));
  }
});

test('formatPrice handles numbers and old strings', () => {
  assert.equal(formatPrice(12.5), '12.50');
  assert.equal(formatPrice('12.00'), '12.00');
  assert.equal(formatPrice('NaN'), 'N/A');
  assert.equal(formatPrice(undefined), 'N/A');
});

