import { mock } from 'node:test';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const root = fileURLToPath(new URL('../..', import.meta.url));
export const url = (p) => pathToFileURL(path.join(root, p)).href;
export const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

export const s = {};
export const reset = (o = {}) => Object.assign(s, {
  uploads: 0, uploadOk: true, added: [], updated: [], saveOk: true, listed: 0, user: { uid: 'u1' },
  salesResult: { success: true, soldCount: 0, earningsCents: 0 }, catalog: [], pageSize: 3, fetchFails: false, products: [], avatar: { success: true, profile_pic: 'https://x.example/me.png' }, profile: { firstName: 'Ada' },
}, o);
reset();

export function setup(body = '') {
  const dom = new JSDOM(`<!doctype html><body>${body}
    <div id="global-notification" class="notification hidden"><span id="notification-message"></span><button class="notification-close"></button></div>
  </body>`, { url: 'http://localhost/page.html' });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.sessionStorage = dom.window.sessionStorage;
  dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };

  globalThis.fetch = async () => {
    s.uploads += 1;
    await tick(5);
    return s.uploadOk
      ? { ok: true, json: async () => ({ secure_url: 'https://res.cloudinary.com/x/img.png' }) }
      : { ok: false, json: async () => ({ error: { message: 'nope' } }) };
  };

  const auth = { get currentUser() { return s.user; } };
  mock.module(url('firebase.js'), { namedExports: { auth, onAuthStateChanged: (_a, cb) => { cb(s.user); return () => {}; } } });
  mock.module(url('Scripts/services/api.js'), {
    namedExports: {
      addNewProduct: async (p) => { s.added.push(p); return s.saveOk ? { success: true, product: p } : { success: false, error: 'denied' }; },
      updateProductDetail: async (p, id) => { s.updated.push([id, p]); return s.saveOk ? { success: true } : { success: false, error: 'denied' }; },
      getproductDetail: async () => { s.listed += 1; return { success: true, products: s.products.length ? s.products : null }; },
      deleteProduct: async () => ({ success: true }),
      fetchProducts: async (uid, cursor) => {
        if (s.fetchFails) return { success: false, error: 'offline' };
        const start = cursor ?? 0;
        const page = s.catalog.slice(start, start + s.pageSize);
        return { success: true, products: page.filter((p) => p.soldBy !== uid), cursor: start + page.length, hasMore: page.length === s.pageSize };
      },
      updateuserProfile: async () => ({ success: true }),
      fetchuser_profile: async () => s.avatar,
      fetchSellerSales: async () => s.salesResult,
    },
  });
  mock.module(url('Scripts/services/auth.js'), {
    namedExports: {
      getCurrentuserdata: async () => s.profile, logoutuser: async () => ({}),
      registerUser: async () => ({ success: true }), signinUser: async () => ({ success: true }),
    },
  });
  return dom.window;
}

export const message = () => document.getElementById('notification-message').textContent;
export const pick = (input, file) => Object.defineProperty(input, 'files', { configurable: true, value: file ? [file] : [] });
export const setFile = (input, file) => {
  pick(input, file);
  Object.defineProperty(input, 'value', { configurable: true, get: () => (file ? 'C:\\fakepath\\a.png' : '') });
};
export const png = (size = 1000, type = 'image/png') => new File([new Uint8Array(size)], 'a.png', { type });
