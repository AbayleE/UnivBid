// Converts string prices on products to numbers.
// Dry run:  node stripe-backend/scripts/migrate_prices.js
// Write:    node stripe-backend/scripts/migrate_prices.js --apply
// Exits 1 when any product has a price that could not be converted, so a
// deploy step can stop and someone can fix those listings by hand.
import { db } from '../config/clients.js';

const BATCH_SIZE = 400;
const MAX_PRICE = 9999999.99;
const apply = process.argv.includes('--apply');

// Only plain decimal prices, with a dot or a comma and at most two decimals.
// Number() would also accept hex ("0x10"), exponents ("1e3") and "Infinity".
const PRICE_PATTERN = /^(\d{1,7})(?:[.,](\d{1,2}))?$/;

export const toNumber = (value) => {
  const match = PRICE_PATTERN.exec(value.trim());
  if (!match) return null;
  // Integer arithmetic avoids float rounding such as 1.005 * 100 = 100.49999.
  const cents = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
  const price = cents / 100;
  return price > 0 && price <= MAX_PRICE ? price : null;
};

const validNumber = (price) => Number.isFinite(price) && price > 0 && price <= MAX_PRICE;

const snapshot = await db.collection('products').get();
const updates = [];
const invalid = [];

snapshot.forEach((doc) => {
  const { price } = doc.data();

  // typeof NaN is 'number', so numeric prices are checked too.
  if (typeof price === 'number') {
    if (!validNumber(price)) invalid.push({ id: doc.id, price });
    return;
  }

  const converted = typeof price === 'string' ? toNumber(price) : null;
  if (converted === null) {
    invalid.push({ id: doc.id, price });
  } else {
    updates.push({ ref: doc.ref, price: converted, updateTime: doc.updateTime });
  }
});

if (apply) {
  for (let start = 0; start < updates.length; start += BATCH_SIZE) {
    const batch = db.batch();
    updates.slice(start, start + BATCH_SIZE).forEach(({ ref, price, updateTime }) => {
      // The precondition makes the write fail if the seller edited the
      // listing after it was read, instead of silently overwriting it.
      batch.update(ref, { price }, updateTime ? { lastUpdateTime: updateTime } : {});
    });
    await batch.commit();
  }
}

console.log(`${apply ? 'Updated' : 'Would update'} ${updates.length} of ${snapshot.size} products.`);

if (invalid.length > 0) {
  console.log(`Left ${invalid.length} products unchanged because their price is invalid:`);
  invalid.forEach(({ id, price }) => console.log(`  ${id}: ${JSON.stringify(price)}`));
  process.exitCode = 1;
}
