import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup, url, tick, s, reset, message, pick, png } from '../helpers/dom.mjs';

const window = setup(`<button id="add_product_btn"></button><img id="profile_pic" src="Images/11.png">`);
reset({
  salesResult: { success: true, soldCount: 2, earningsCents: 11050 },
  products: [
    { pid: 'a', name: 'Lamp', price: 10, status: 'Available', image: ' ', product_quantity: '1', description: 'd', condition: 'New' },
    { pid: 'b', name: 'Desk', price: '20.50', status: 'Available', image: 'https://x.example/d.png', product_quantity: '1', description: 'd', condition: 'New' },
    { pid: 'c', name: 'Bike', price: 100.25, status: 'Sold', image: '', product_quantity: '1', description: 'd', condition: 'New' },
    { pid: 'd', name: 'Pen', price: '5.25', status: 'Sold', image: '', product_quantity: '1', description: 'd', condition: 'New' },
  ],
});

await import(url('Scripts/pages/dashboard.js'));
window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
await tick(30);

const stat = (id) => document.querySelector(`#${id} h2`).innerText ?? document.querySelector(`#${id} h2`).textContent;
const dialog = () => document.querySelector('dialog');

test('stats come from real listings', () => {
  assert.equal(String(stat('total_earning')), '110.50');
  assert.equal(String(stat('total_sold_items')), '2');
  assert.equal(String(stat('total_active_listings')), '2');
  assert.equal(document.querySelector('#total_bought_items'), null);
  assert.equal(document.querySelector('#total_active_listings p').innerText, 'Active Listings');
});

test('sold listings have no Edit button', () => {
  assert.equal(document.querySelectorAll('.product_card_list').length, 4);
  assert.equal(document.querySelectorAll('.edit-btn').length, 2);
});

test('nav avatar shows the user picture', () => {
  assert.equal(document.getElementById('profile_pic').src, 'https://x.example/me.png');
});

test('whitespace image falls back to the placeholder', () => {
  const imgs = [...document.querySelectorAll('.product_card_list img')];
  assert.equal(imgs.length, 4);
  assert.match(imgs[0].src, /Images\/13\.png$/);
  assert.equal(imgs[1].src, 'https://x.example/d.png');
});

test('Create Auction button does not open a dialog', async () => {
  document.getElementById('add_product_btn').click();
  await tick(10);
  assert.equal(dialog(), null);
});

test('Edit opens the edit dialog and saves without a new image', async () => {
  document.querySelectorAll('.edit-btn')[1].click();
  assert.equal(dialog().querySelector('h2').textContent || dialog().querySelector('h2').innerText, 'Edit Product');
  pick(dialog().querySelector('#product_image'), null);
  dialog().querySelector('#submit_btn').click();
  await tick(20);
  assert.equal(s.updated[0][0], 'b');
  assert.equal(s.updated[0][1].image, 'https://x.example/d.png');
  assert.equal(dialog(), null);
  assert.equal(document.querySelectorAll('.product_card_list').length, 4);
  assert.match(message(), /updated successfully/);
});

test('Edit with a new image uploads first; a space image is not written back', async () => {
  s.updated.length = 0;
  document.querySelectorAll('.edit-btn')[0].click();
  pick(dialog().querySelector('#product_image'), null);
  dialog().querySelector('#submit_btn').click();
  await tick(20);
  assert.equal(s.updated[0][1].image, '');

  s.updated.length = 0; s.uploads = 0;
  document.querySelectorAll('.edit-btn')[0].click();
  pick(dialog().querySelector('#product_image'), png());
  dialog().querySelector('#submit_btn').click();
  await tick(30);
  assert.equal(s.uploads, 1);
  assert.equal(s.updated[0][1].image, 'https://res.cloudinary.com/x/img.png');
});

test('failed edit keeps the dialog open', async () => {
  s.saveOk = false;
  document.querySelectorAll('.edit-btn')[0].click();
  pick(dialog().querySelector('#product_image'), null);
  dialog().querySelector('#submit_btn').click();
  await tick(20);
  assert.ok(dialog());
  assert.equal(dialog().querySelector('#submit_btn').disabled, false);
  assert.match(message(), /Update Failed/);
});
