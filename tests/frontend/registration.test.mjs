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

// Registration rollback
const state = {};
const reset = (o = {}) => Object.assign(state, { deleted: [], signedOut: 0, saved: [], setDocFails: false, deleteFails: false, createFails: false }, o);
const fakeUser = { uid: 'u1' };
mock.module(url('firebase.js'), {
  namedExports: {
    auth: {}, db: {}, doc: (...a) => a,
    createUserWithEmailAndPassword: async () => {
      if (state.createFails) throw Object.assign(new Error('x'), { code: 'auth/email-already-in-use' });
      return { user: fakeUser };
    },
    setDoc: async (_ref, data) => {
      if (state.setDocFails) throw Object.assign(new Error('denied'), { code: 'permission-denied' });
      state.saved.push(data);
    },
    deleteUser: async (u) => {
      if (state.deleteFails) throw new Error('no');
      state.deleted.push(u.uid);
    },
    signOut: async () => { state.signedOut += 1; },
    signInWithEmailAndPassword: async () => {}, onAuthStateChanged: () => {}, deleteDoc: 0, getDoc: 0,
    addDoc: 0, collection: 0, getDocs: 0, query: 0, where: 0, updateDoc: 0, onSnapshot: 0,
    setPersistence: 0, browserLocalPersistence: 0,
  },
});
const { registerUser } = await import(url('Scripts/services/auth.js'));
const reg = () => registerUser('Ada', 'L', 'a@b.c', 'password1', '', 'MIT');

test('success keeps the account and stores university correctly', async () => {
  reset();
  const r = await reg();
  assert.equal(r.success, true);
  assert.deepEqual(state.deleted, []);
  assert.equal(state.saved[0].university, 'MIT');
  assert.equal(state.saved[0].phone, '');
});

test('failed profile write deletes the Auth account', async () => {
  reset({ setDocFails: true });
  const r = await reg();
  assert.deepEqual(r, { success: false, error: 'permission-denied' });
  assert.deepEqual(state.deleted, ['u1']);
  assert.equal(state.signedOut, 0);
});

test('failed rollback signs out and still reports the original error', async () => {
  reset({ setDocFails: true, deleteFails: true });
  const r = await reg();
  assert.deepEqual(r, { success: false, error: 'permission-denied' });
  assert.equal(state.signedOut, 1);
});

test('failed account creation deletes nothing', async () => {
  reset({ createFails: true });
  const r = await reg();
  assert.deepEqual(r, { success: false, error: 'auth/email-already-in-use' });
  assert.deepEqual(state.deleted, []);
});

