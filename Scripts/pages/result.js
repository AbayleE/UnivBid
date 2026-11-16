import { ProfilePicture } from '../components/AuthModal.js';

// success.html and cancel.html. Stripe sends the buyer here; the order itself
// is recorded by the webhook, so nothing here touches the database.
document.addEventListener('DOMContentLoaded', () => {
    new ProfilePicture(document.getElementById('profile_pic'));

    const params = new URLSearchParams(window.location.search);

    const ref = document.getElementById('result-ref');
    const sessionId = params.get('session_id');
    if (ref && sessionId && /^cs_[A-Za-z0-9_]+$/.test(sessionId)) {
        ref.textContent = `Reference: ${sessionId.slice(-8)}`;
    }

    const back = document.getElementById('back-to-listing');
    const productId = params.get('product');
    if (back && productId && /^[A-Za-z0-9_-]{1,128}$/.test(productId)) {
        back.href = `product_listing_page.html?id=${encodeURIComponent(productId)}`;
    }

    // The checkout selection is no longer needed either way.
    sessionStorage.removeItem('buy_now_item');
});
