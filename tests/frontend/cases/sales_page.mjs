import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup, url, tick, reset, message } from '../../helpers/dom.mjs';

const item = (i, soldBy = 'other') => ({ pid: `p${i}`, name: `Item ${i}`, price: i + 1, status: 'Available', soldBy, condition: 'New', image: '' });
const scenario = process.env.SCENARIO;
const catalogs = {
  paged: [item(0, 'u1'), item(1, 'u1'), item(2, 'u1'), item(3), item(4), item(5), item(6), item(7)],
  empty: [],
  allOwn: [item(0, 'u1'), item(1, 'u1'), item(2, 'u1')],
  fail: [item(0)],
};

const window = setup(`<button id="add_product_btn"></button><img id="profile_pic" src="Images/11.png"><div class="search_bar"><input><button></button></div>`);
reset({ catalog: catalogs[scenario], fetchFails: scenario === 'fail' });
await import(url('Scripts/pages/sales_page.js'));
window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
await tick(30);

const names = () => [...document.querySelectorAll('.product_card strong')].map((n) => n.textContent);
const button = () => document.querySelector('.load_more_btn');

if (scenario === 'paged') {
  test('skips a page of only own listings and shows the next page', () => {
    assert.deepEqual(names(), ['Item 3', 'Item 4', 'Item 5']);
    assert.equal(button().hidden, false);
    assert.equal(button().previousElementSibling.classList.contains('listing_board'), true);
  });
  test('Load more appends the next page and hides at the end', async () => {
    button().click();
    assert.equal(button().disabled, true);
    await tick(20);
    assert.deepEqual(names(), ['Item 3', 'Item 4', 'Item 5', 'Item 6', 'Item 7']);
    assert.equal(button().hidden, true);
    assert.equal(button().disabled, false);
  });
}
if (scenario === 'empty' || scenario === 'allOwn') {
  test(`${scenario}: shows the empty message and no Load more`, () => {
    assert.match(document.querySelector('.listing_board').textContent, /No available products found/);
    assert.equal(button().hidden, true);
  });
}
if (scenario === 'fail') {
  test('failure shows an error and leaves the button usable', () => {
    assert.match(message(), /Failed to display products: offline/);
    assert.equal(button().disabled, false);
  });
}
