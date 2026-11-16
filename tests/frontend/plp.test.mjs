import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup, url, tick, s, reset } from '../helpers/dom.mjs';

// Listing page loaded from a shareable link: a stale cached copy paints first,
// then the live listing replaces it.
const window = setup(`<img id="profile_pic" src="Images/11.png">
  <article id="listing-detail"><div class="left_container"></div><div class="right_container"></div></article>
  <section id="empty-listing-state" hidden><h1>No listing selected</h1><p>Choose one.</p></section>`);
window.history.replaceState(null, '', '/product_listing_page.html?id=abc');

const live = { pid: 'abc', name: 'Lamp (live)', price: 15, status: 'Available', product_quantity: 2, image: 'https://res.cloudinary.com/x/l.png', condition: 'New', soldBy_name: 'Ada' };
reset({ byId: { abc: live } });
window.sessionStorage.setItem('selected_item', JSON.stringify({ ...live, name: 'Lamp (cached)', price: 10 }));

await import(url('Scripts/pages/plp.js'));
window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
await tick(30);

test('renders the live listing from the id in the URL, replacing the cached copy', () => {
  assert.equal(document.getElementById('listing-title').textContent, 'Lamp (live)');
  assert.equal(document.getElementById('price').textContent, '€15.00');
  assert.equal(document.title, 'Lamp (live) | UnivBid');
  assert.equal(JSON.parse(window.sessionStorage.getItem('selected_item')).name, 'Lamp (live)');
  assert.equal(document.getElementById('empty-listing-state').hasAttribute('hidden'), true);
});

test('quantity field is shown for multi-unit listings and Contact seller stores the selection', () => {
  const qty = document.getElementById('qty_input');
  assert.equal(qty.hidden, false);
  assert.equal(qty.max, '2');
  document.getElementById('buynow').click();
  assert.deepEqual(JSON.parse(window.sessionStorage.getItem('buy_now_item')), { productId: 'abc', quantity: 1 });
});

test('image sinks only accept HTTPS URLs', async () => {
  const { setListingImage } = await import(url('Scripts/components/listingMeta.js'));
  const img = document.createElement('img');
  setListingImage(img, 'http://evil.example/track.gif', 'x');
  assert.match(img.src, /Images\/placeholder-listing\.svg$/);
  setListingImage(img, 'https://res.cloudinary.com/x/a.png', 'x');
  assert.equal(img.src, 'https://res.cloudinary.com/x/a.png');
});
