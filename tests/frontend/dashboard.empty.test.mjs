import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup, url, tick, reset } from '../helpers/dom.mjs';

// Before the first sale the earnings tile says so, and the active count comes
// from the Firestore aggregation rather than the loaded page.
const window = setup(`<button id="add_product_btn"></button><img id="profile_pic" src="Images/11.png">`);
reset({
  salesResult: { success: true, soldCount: 0, earningsCents: 0 },
  activeCount: { success: true, active: 7 },
  products: [
    { pid: 'a', name: 'Lamp', price: 10, status: 'Available', image: '', product_quantity: 1, description: 'd', condition: 'New' },
  ],
});

await import(url('Scripts/pages/dashboard.js'));
window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
await tick(30);

const stat = (id) => document.querySelector(`#${id} .stat-number`).textContent;

test('earnings tile reads "No sales yet" and active count uses the aggregation', () => {
  assert.equal(stat('total_earning'), 'No sales yet');
  assert.ok(document.getElementById('total_earning').classList.contains('stat-empty'));
  assert.equal(stat('total_sold_items'), '0');
  assert.equal(stat('total_active_listings'), '7');
});

test('listing links carry the listing id', () => {
  const link = document.querySelector('.product_card_list a[href*="product_listing_page.html"]');
  assert.ok(link, 'card links to the listing page');
  assert.match(link.getAttribute('href'), /\?id=a$/);
});
