import { auth, onAuthStateChanged } from '../../firebase.js';
import { ProfilePicture } from '../components/AuthModal.js';
import { fetchProductById } from '../services/api.js';
import { signInUrl } from '../services/auth.js';
import { showNotification } from '../services/notifications.js';
import { formatPrice } from '../services/price.js';
import { clearErrorOnInput, looksLikeEmail, validateInputs } from '../components/form.js';
import { setListingImage } from '../components/listingMeta.js';

// "Contact the seller" page. Sending isn't connected yet, so the form only
// validates and shows a preview of the message.

// The listing page leaves { productId, quantity }; the id in the URL wins.
function selection() {
    const params = new URLSearchParams(window.location.search);
    let stored = {};
    try { stored = JSON.parse(sessionStorage.getItem('buy_now_item')) || {}; } catch { /* ignore */ }
    const productId = params.get('id') || stored.productId;
    const quantity = Math.max(1, parseInt(stored.productId === productId ? stored.quantity : 1, 10) || 1);
    return productId ? { productId, quantity } : null;
}

function show(product, quantity) {
    const productName = product.name || 'Selected item';
    const unit = formatPrice(product.price);
    const total = unit === 'N/A' ? 'Price not set' : `€${(Number(unit) * quantity).toFixed(2)}`;

    document.getElementById('pname').textContent = productName;
    document.getElementById('pprice').textContent = quantity > 1 ? `${total} (${quantity} × €${unit})` : total;
    document.getElementById('pcond').textContent = `Condition: ${product.condition || 'Not specified'} · Seller: ${product.soldBy_name || 'a student'}`;
    setListingImage(document.getElementById('pimg'), product.image, productName);

    const message = document.getElementById('message');
    if (message && !message.value) {
        message.value = `Hi, is "${productName}" still available? I'd like to arrange a time to pick it up.`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ProfilePicture(document.getElementById('profile_pic'));

    const selected = selection();
    if (!selected) {
        window.location.replace('sales_page.html');
        return;
    }

    const form = document.querySelector('.contact-form');
    const status = document.getElementById('inquiry-status');
    clearErrorOnInput(form);

    form?.addEventListener('submit', (event) => {
        event.preventDefault();
        const name = document.getElementById('name');
        const email = document.getElementById('email');
        const message = document.getElementById('message');
        const ok = validateInputs([
            [name, name.value.trim() ? '' : 'Enter your name.'],
            [email, !email.value.trim() ? 'Enter your email address.' : !looksLikeEmail(email.value.trim()) ? 'Enter an email address like name@university.edu.' : ''],
            [message, message.value.trim() ? '' : 'Write a message to the seller.'],
        ]);
        if (!ok) return;

        const notice = document.createElement('div');
        notice.className = 'notice notice-warning';
        const p = document.createElement('p');
        p.append(Object.assign(document.createElement('strong'), { textContent: 'Your message looks good, but it was not sent. ' }),
            'Seller messaging is not connected in this prototype yet.');
        notice.append(p);
        status.replaceChildren(notice);
        showNotification('Preview only: seller messaging is not connected yet, so nothing was sent.', 'warning');
    });

    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.replace(signInUrl());
            return;
        }

        const result = await fetchProductById(selected.productId);
        if (!result.success || !result.product || result.product.status !== 'Available') {
            showNotification('That listing is no longer available.', 'warning');
            window.location.replace('sales_page.html');
            return;
        }
        show(result.product, selected.quantity);
    });
});
