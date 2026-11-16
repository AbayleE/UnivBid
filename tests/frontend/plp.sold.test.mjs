import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup, url, tick, reset } from '../helpers/dom.mjs';

// A shared link to a listing that has since sold stays readable, without a
// Contact seller button. A missing listing shows the not-found state.
const window = setup(`<img id="profile_pic" src="Images/11.png">
  <article id="listing-detail"><div class="left_container"></div><div class="right_container"></div></article>
  <section id="empty-listing-state" hidden><h1>No listing selected</h1><p>Choose one.</p></section>`);
window.history.replaceState(null, '', '/product_listing_page.html?id=sold1');

reset({ byId: { sold1: { pid: 'sold1', name: 'Desk', price: 40, status: 'Sold', product_quantity: 0, image: '', condition: 'Used' } } });

await import(url('Scripts/pages/plp.js'));
window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
await tick(30);

test('sold listing renders read-only with a banner', () => {
  assert.equal(document.getElementById('listing-title').textContent, 'Desk');
  assert.ok(document.getElementById('sold-banner'));
  assert.equal(document.getElementById('buynow'), null);
  assert.equal(document.getElementById('qty_input'), null);
  assert.equal(document.getElementById('empty-listing-state').hasAttribute('hidden'), true);
});

test('unknown id shows the not-found state', async () => {
  window.history.replaceState(null, '', '/product_listing_page.html?id=nope');
  window.sessionStorage.clear();
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  await tick(30);
  const empty = document.getElementById('empty-listing-state');
  assert.equal(empty.hasAttribute('hidden'), false);
  assert.equal(empty.querySelector('h1').textContent, 'Listing not found');
});
