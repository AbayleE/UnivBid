// Converts string prices on products to numbers.
// Dry run:  node stripe-backend/scripts/migrate_prices.js
// Write:    node stripe-backend/scripts/migrate_prices.js --apply
import { db } from '../config/clients.js';

const BATCH_SIZE = 400;
const MAX_PRICE = 9999999.99;
const apply = process.argv.includes('--apply');

const toNumber = (value) => {
  if (value.trim() === '') return null;
  const price = Math.round(Number(value) * 100) / 100;
  return Number.isFinite(price) && price > 0 && price <= MAX_PRICE ? price : null;
};

const snapshot = await db.collection('products').get();
const updates = [];
const invalid = [];

snapshot.forEach((doc) => {
  const { price } = doc.data();
  if (typeof price === 'number') return;

  const converted = typeof price === 'string' ? toNumber(price) : null;
  if (converted === null) {
    invalid.push({ id: doc.id, price });
  } else {
    updates.push({ ref: doc.ref, price: converted });
  }
});

if (apply) {
  for (let start = 0; start < updates.length; start += BATCH_SIZE) {
    const batch = db.batch();
    updates.slice(start, start + BATCH_SIZE).forEach(({ ref, price }) => {
      batch.update(ref, { price });
    });
    await batch.commit();
  }
}

console.log(`${apply ? 'Updated' : 'Would update'} ${updates.length} of ${snapshot.size} products.`);

if (invalid.length > 0) {
  console.log(`Left ${invalid.length} products unchanged because their price is invalid:`);
  invalid.forEach(({ id, price }) => console.log(`  ${id}: ${JSON.stringify(price)}`));
}
