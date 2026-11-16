import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../..', import.meta.url));
const url = (p) => pathToFileURL(path.join(root, p)).href;

const calls = [];
let docs = [];
const snap = (d) => ({ id: d.id, data: () => d });
const stub = () => {};
mock.module(url('firebase.js'), {
  namedExports: {
    auth: { currentUser: { uid: 'me' } }, db: {},
    collection: (_db, name) => name,
    where: (...a) => ['where', ...a], orderBy: (...a) => ['orderBy', ...a],
    limit: (n) => ['limit', n], startAfter: (c) => ['startAfter', c],
    query: (col, ...c) => ({ col, c }),
    getDocs: async (q) => { calls.push(q); return { docs: docs.map(snap), size: docs.length }; },
    count: () => 'count', sum: (f) => ['sum', f],
    getAggregateFromServer: async (q, spec) => { calls.push({ q, spec }); return { data: () => ({ soldCount: 3, grossCents: 5000, feeCents: 300 }) }; },
    signOut: stub, createUserWithEmailAndPassword: stub, signInWithEmailAndPassword: stub, onAuthStateChanged: stub,
    setDoc: stub, deleteDoc: stub, doc: stub, getDoc: stub, addDoc: stub, updateDoc: stub, onSnapshot: stub,
    setPersistence: stub, browserLocalPersistence: stub,
  },
});
mock.module(url('Scripts/services/auth.js'), { namedExports: { getCurrentuserdata: async () => null } });
const { fetchProducts, fetchSellerSales, PRODUCTS_PAGE_SIZE } = await import(url('Scripts/services/api.js'));

const page = (n, soldBy = 'x') => Array.from({ length: n }, (_, i) => ({ id: `d${i}`, soldBy }));

test('first page: available only, newest first, limited, no cursor', async () => {
  calls.length = 0; docs = page(PRODUCTS_PAGE_SIZE);
  const r = await fetchProducts('me');
  assert.equal(calls[0].col, 'products');
  assert.deepEqual(calls[0].c, [['where', 'status', '==', 'Available'], ['orderBy', 'dateListed', 'desc'], ['limit', 12]]);
  assert.equal(r.hasMore, true);
  assert.equal(r.products.length, 12);
  assert.equal(r.cursor.id, 'd11');
});

test('next page starts after the cursor; own listings are filtered; short page ends', async () => {
  calls.length = 0; docs = [...page(2, 'me'), { id: 'z', soldBy: 'x' }];
  const r = await fetchProducts('me', 'CURSOR');
  assert.deepEqual(calls[0].c.at(-1), ['startAfter', 'CURSOR']);
  assert.deepEqual(r.products.map((p) => p.id), ['z']);
  assert.equal(r.hasMore, false);
});

test('empty page keeps the previous cursor', async () => {
  docs = [];
  const r = await fetchProducts('me', 'CURSOR');
  assert.equal(r.cursor, 'CURSOR');
  assert.deepEqual(r.products, []);
});

test('sales totals come from one aggregation, not documents', async () => {
  calls.length = 0;
  const r = await fetchSellerSales();
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].q.c, [['where', 'sellerUid', '==', 'me'], ['where', 'status', '==', 'paid']]);
  assert.deepEqual(calls[0].spec, { soldCount: 'count', grossCents: ['sum', 'amountCents'], feeCents: ['sum', 'platformFeeCents'] });
  assert.deepEqual(r, { success: true, soldCount: 3, earningsCents: 4700 });
});
