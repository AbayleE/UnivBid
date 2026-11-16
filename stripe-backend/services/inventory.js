import { db } from '../config/clients.js';

const productRef = (productId) => db.collection('products').doc(productId);

// Units a buyer can still start a checkout for.
export const available = (product) => {
  if (product?.status !== 'Available') return 0;
  const quantity = Number(product.product_quantity);
  const reserved = Number(product.reserved) || 0;
  return Number.isFinite(quantity) ? quantity - reserved : 0;
};

// Holds one unit while a Checkout Session is open, so two buyers cannot both
// pay for the last unit. Throws an error with status 409 when nothing is left.
export const reserveUnit = async (productId) => db.runTransaction(async (transaction) => {
  const snapshot = await transaction.get(productRef(productId));
  const product = snapshot.data();

  if (available(product) < 1) {
    throw Object.assign(new Error('This product is no longer available'), { status: 409 });
  }

  transaction.update(productRef(productId), { reserved: (Number(product.reserved) || 0) + 1 });
  return product;
});

// Called when a session expires, or its creation fails after the hold.
export const releaseUnit = async (productId) => db.runTransaction(async (transaction) => {
  const snapshot = await transaction.get(productRef(productId));
  const reserved = Number(snapshot.data()?.reserved) || 0;
  if (!snapshot.exists || reserved < 1) return;
  transaction.update(productRef(productId), { reserved: reserved - 1 });
});
