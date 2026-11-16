import { auth, onAuthStateChanged } from '../../firebase.js';
import { ProfilePicture } from '../components/AuthModal.js';
import { signInUrl } from '../services/auth.js';
import { showNotification } from '../services/notifications.js';
import { fetchSellerStatus, startSellerOnboarding } from '../services/payment.js';

// Stripe returns sellers here after onboarding. The redirect is not proof of
// completion, so the page asks the backend, which asks Stripe.
document.addEventListener('DOMContentLoaded', () => {
    new ProfilePicture(document.getElementById('profile_pic'));

    const title = document.getElementById('connect-title');
    const text = document.getElementById('connect-text');
    const requirements = document.getElementById('connect-requirements');
    const button = document.getElementById('connect-continue');

    const explain = (heading, body) => {
        title.textContent = heading;
        text.textContent = body;
    };

    button?.addEventListener('click', async () => {
        button.disabled = true;
        try {
            await startSellerOnboarding();
        } catch (error) {
            button.disabled = false;
            showNotification(error.message, 'error');
        }
    });

    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.replace(signInUrl());
            return;
        }

        const status = await fetchSellerStatus();
        if (!status) {
            explain('Seller accounts are not available yet', 'Online payments are not switched on for this deployment.');
            return;
        }

        if (!status.connected) {
            explain('Set up payouts', 'Connect a Stripe account so buyers can pay you online.');
            button.textContent = 'Start onboarding';
            button.hidden = false;
            return;
        }

        if (status.chargesEnabled) {
            explain('Your seller account is ready', status.payoutsEnabled
                ? 'Buyers can pay you online, and payouts go to your bank account.'
                : 'Buyers can pay you online. Payouts start once Stripe has verified your bank details.');
            return;
        }

        explain('Almost there', 'Stripe still needs a few details before you can accept payments.');
        const due = Array.isArray(status.requirementsDue) ? status.requirementsDue : [];
        if (due.length) {
            requirements.replaceChildren(...due.map((item) => {
                const li = document.createElement('li');
                li.textContent = item.replaceAll('_', ' ').replaceAll('.', ': ');
                return li;
            }));
            requirements.hidden = false;
        }
        button.hidden = false;
    });
});
