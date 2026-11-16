import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup, url, tick, s, reset } from '../helpers/dom.mjs';

const window = setup(`<button id="add_product_btn"></button>`);
reset({ profile: { firstName: 'Ada', contact_choice: { contact_email: false, contact_phone: true } } });
await import(url('Scripts/pages/profile.js'));
window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
await tick(20);

const email = () => document.getElementById('check_box_email');
const phone = () => document.getElementById('check_box_phone');

test('saved preferences load, including a false email choice', () => {
  assert.equal(email().checked, false);
  assert.equal(phone().checked, true);
});

test('labels control their own checkboxes', () => {
  const labels = [...document.querySelectorAll('.choice_block label')];
  assert.deepEqual(labels.map((l) => l.control?.id), ['check_box_email', 'check_box_phone']);
});

test('defaults apply to profiles with no saved choice', async () => {
  const { profileLoad } = await import(url('Scripts/components/AuthModal.js'));
  const f = () => document.createElement('input');
  const box = () => Object.assign(document.createElement('input'), { type: 'checkbox' });
  const e = box(); const p = box();
  const loader = new profileLoad(f(), f(), f(), f(), f(), e, p, document.createElement('button'), document.createElement('div'));
  loader.populateform({ firstName: 'Old' });
  assert.equal(e.checked, true);
  assert.equal(p.checked, false);
});
