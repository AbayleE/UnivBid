import { AuthButton } from '../components/AuthModal.js';

// Used by the public pages (home, our story, contact): the header's Sign in
// and Sign up links, plus the home hero buttons, follow the signed-in state.
document.addEventListener('DOMContentLoaded', function () {
    new AuthButton(
        document.querySelector(".register_btn"),
        document.querySelector(".cta_browse"),
        document.querySelector(".login_btn"),
        document.querySelector(".cta_signup"),
    );
});
