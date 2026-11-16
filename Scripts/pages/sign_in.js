import { SigninUser } from '../components/AuthModal.js';
import { safeNext } from '../services/auth.js';
import { clearErrorOnInput, looksLikeEmail, validateInputs } from '../components/form.js';

const MESSAGES = {
  registered: ['success', 'Your account is ready. Sign in to continue.'],
  exists: ['info', 'An account with that email already exists. Sign in instead.'],
};

document.addEventListener("DOMContentLoaded", () => {
  const submitBtn = document.getElementById('submit');
  const form = document.getElementById('sign_inform');
  const status = document.getElementById('auth-status');

  // Messages passed from sign-up, so they aren't lost in the redirect.
  const params = new URLSearchParams(window.location.search);
  const key = Object.keys(MESSAGES).find((k) => params.has(k));
  if (status && key) {
    const [type, text] = MESSAGES[key];
    const notice = document.createElement('div');
    notice.className = `notice${type === 'success' ? ' notice-success' : ''}`;
    const p = document.createElement('p');
    p.textContent = text;
    notice.append(p);
    status.append(notice);
  }

  if (!form) return;
  clearErrorOnInput(form);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    const ok = validateInputs([
      [emailInput, !email ? 'Enter your email address.' : !looksLikeEmail(email) ? 'Enter an email address like name@university.edu.' : ''],
      [passwordInput, password ? '' : 'Enter your password.'],
    ]);
    if (!ok) return;

    new SigninUser(email, password, submitBtn, safeNext(params.get('next')));
  });
});
