import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup, url, tick, s, reset, message, setFile, png } from '../helpers/dom.mjs';

const window = setup();
await import(url('Scripts/pages/create_auction.js'));
window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
const $ = (q) => document.querySelector(q);
const fill = (agreed = true) => {
  $('#product_name').value = 'Lamp';
  $('#product_description').value = 'Nice';
  $('#product_price').value = '12.5';
  $('#product_quantity').value = '1';
  $('#auction_deadline').value = '2030-01-01';
  $('#agreementCheckbox').checked = agreed;
};
const submit = () => $('#submit_btn').click();

test('image is required', async () => {
  reset(); fill(); setFile($('#product_image'), null);
  submit(); await tick(20);
  assert.equal(s.uploads, 0); assert.equal(s.added.length, 0);
  assert.match(message(), /required/);
});

test('terms must be accepted', async () => {
  reset(); fill(false); setFile($('#product_image'), png());
  submit(); await tick(20);
  assert.equal(s.uploads, 0); assert.equal(s.added.length, 0);
  assert.match(message(), /Terms of Service/);
});

test('files over 5MB and non-images are rejected before upload', async () => {
  for (const [file, text] of [[png(5 * 1024 * 1024 + 1), /5MB/], [png(100, 'text/plain'), /image file/]]) {
    reset(); fill(); setFile($('#product_image'), file);
    submit(); await tick(20);
    assert.equal(s.uploads, 0); assert.equal(s.added.length, 0);
    assert.match(message(), text);
    assert.equal($('#submit_btn').disabled, false);
  }
});

test('signed-out user cannot upload', async () => {
  reset({ user: null }); fill(); setFile($('#product_image'), png());
  submit(); await tick(20);
  assert.equal(s.uploads, 0);
  assert.match(message(), /sign in/);
});

test('failed upload saves nothing and allows retry', async () => {
  reset({ uploadOk: false }); fill(); setFile($('#product_image'), png());
  submit(); await tick(30);
  assert.equal(s.added.length, 0);
  assert.match(message(), /upload failed/i);
  assert.equal($('#submit_btn').disabled, false);
});

test('exactly 5MB is accepted; saves URL once and blocks double submit', async () => {
  reset(); fill(); setFile($('#product_image'), png(5 * 1024 * 1024));
  submit();
  assert.equal($('#submit_btn').disabled, true);
  submit();
  await tick(30);
  assert.equal(s.uploads, 1); assert.equal(s.added.length, 1);
  assert.equal(s.added[0].image, 'https://res.cloudinary.com/x/img.png');
  assert.equal(s.added[0].price, 12.5);
  assert.match(message(), /added successfully/);
});
