import { AddnewUser } from '../components/AuthModal.js';
import { showNotification } from '../services/notifications.js';
import { clearErrorOnInput, looksLikeEmail, validateInputs } from '../components/form.js';

document.addEventListener("DOMContentLoaded", () => {
  const submitBtn = document.getElementById('submit');
  const form = document.getElementById('sign_upform');
  if (!form) return;
  clearErrorOnInput(form);

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const $ = (id) => document.getElementById(id);
    const First_name = $("Fname").value.trim();
    const Last_name = $("Lname").value.trim();
    const email = $("email").value.trim();
    const university = $("university").value.trim();
    const password = $("password").value;
    const confirm_password = $("confirm-password").value;

    const ok = validateInputs([
      [$("Fname"), First_name ? '' : 'Enter your first name.'],
      [$("Lname"), Last_name ? '' : 'Enter your last name.'],
      [$("email"), !email ? 'Enter your email address.' : !looksLikeEmail(email) ? 'Enter an email address like name@university.edu.' : ''],
      [$("password"), password.length >= 8 ? '' : 'Use at least 8 characters.'],
      [$("confirm-password"), !confirm_password ? 'Repeat your password.' : confirm_password !== password ? "Passwords don't match." : ''],
    ]);

    if (!ok) {
      showNotification("Please check the highlighted fields.", "error");
      return;
    }

    new AddnewUser(First_name, Last_name, email, password, university, submitBtn);
  });
});
