import { AuthButton } from '../components/AuthModal.js';
import { enableListingSearch } from '../services/search.js';

document.addEventListener('DOMContentLoaded', function () {
    const bodyLeft = document.querySelector(".main_section");

    if (bodyLeft) {
        setTimeout(() => {
            bodyLeft.classList.add('slide-down');
        }, 100);

    }

    // document.getElementById("add_product_btn").addEventListener("click", function () {
    //     window.location.href = "create_auction.html";
    // });

   
    const cta_button = document.querySelector(".register_btn");
    const browse_button = document.querySelector(".cta_browse");
    const login_button = document.querySelector(".login_btn");
    new AuthButton(cta_button, browse_button, login_button);
    enableListingSearch();

    const signup_button = document.querySelector(".cta_signup");
    signup_button?.addEventListener("click", () => {
        window.location.href = "sign_up.html";
    });
});
