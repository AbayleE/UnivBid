import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup, url, tick, reset } from '../../helpers/dom.mjs';

// One page per process, chosen by env, because each page assumes its own DOM.
const page = process.env.PAGE;
const loggedIn = process.env.LOGGED_IN !== 'false';
const window = setup(`<button id="add_product_btn"></button><img id="profile_pic" src="Images/11.png">
  <div class="left_container"></div><div class="right_container"></div>`);
reset({ user: loggedIn ? { uid: 'u1' } : null });
await import(url(`Scripts/pages/${page}.js`));
window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
await tick(30);

test(`${page}: avatar ${loggedIn ? 'shows user picture' : 'keeps default when logged out'}`, () => {
  const { src } = document.getElementById('profile_pic');
  if (loggedIn) assert.equal(src, 'https://x.example/me.png');
  else assert.match(src, /Images\/11\.png$/);
});
