// Shared page chrome: mobile menu, account menu, sign out, current page,
// password show/hide and screen reader announcements for toasts.
// UI only: it uses the existing auth service and never changes it.
import { logoutuser } from '../services/auth.js';
import { showNotification } from '../services/notifications.js';

function setupMenu() {
    const toggle = document.querySelector('.menu-toggle');
    const menu = document.getElementById('site-menu');
    if (!toggle || !menu) return;

    const setOpen = (open) => {
        toggle.setAttribute('aria-expanded', String(open));
        menu.classList.toggle('is-open', open);
    };

    toggle.addEventListener('click', () => {
        setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && menu.classList.contains('is-open')) {
            setOpen(false);
            toggle.focus();
        }
    });

    // Close the mobile panel when the layout switches to desktop.
    window.matchMedia('(min-width: 900px)').addEventListener('change', () => setOpen(false));
}

function setupAccountMenu() {
    const toggle = document.querySelector('.account-toggle');
    const panel = document.getElementById('account-panel');
    if (!toggle || !panel) return;

    const setOpen = (open) => {
        toggle.setAttribute('aria-expanded', String(open));
        panel.classList.toggle('is-open', open);
    };

    toggle.addEventListener('click', (event) => {
        event.stopPropagation();
        const open = toggle.getAttribute('aria-expanded') !== 'true';
        setOpen(open);
        if (open) panel.querySelector('a, button')?.focus();
    });

    document.addEventListener('click', (event) => {
        if (!panel.contains(event.target)) setOpen(false);
    });

    panel.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            setOpen(false);
            toggle.focus();
        }
    });

    panel.addEventListener('focusout', (event) => {
        if (window.matchMedia('(min-width: 900px)').matches
            && !panel.contains(event.relatedTarget) && event.relatedTarget !== toggle) {
            setOpen(false);
        }
    });
}

function setupSignOut() {
    document.querySelectorAll('[data-signout]').forEach((button) => {
        button.addEventListener('click', async () => {
            button.disabled = true;
            const result = await logoutuser();
            if (result?.error) {
                button.disabled = false;
                showNotification(`Sign out failed: ${result.error}`, 'error');
                return;
            }
            window.location.href = 'index.html';
        });
    });
}

function markCurrentPage() {
    const current = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.site-header a[href]').forEach((link) => {
        const target = link.getAttribute('href').split('#')[0];
        if (target === current && !link.classList.contains('brand') && !link.classList.contains('btn')) {
            link.setAttribute('aria-current', 'page');
        }
    });
}

function setupPasswordToggles() {
    document.querySelectorAll('[data-password-toggle]').forEach((button) => {
        const input = document.getElementById(button.getAttribute('aria-controls'));
        if (!input) return;
        button.addEventListener('click', () => {
            const show = input.type === 'password';
            input.type = show ? 'text' : 'password';
            button.textContent = show ? 'Hide' : 'Show';
            button.setAttribute('aria-pressed', String(show));
        });
    });
}

// The toast hides itself with visibility, which screen readers can miss.
// Mirror each new message into always-present live regions instead.
function setupAnnouncer() {
    const message = document.getElementById('notification-message');
    const toast = document.getElementById('global-notification');
    if (!message || !toast) return;

    const polite = document.createElement('div');
    polite.className = 'visually-hidden';
    polite.setAttribute('aria-live', 'polite');
    polite.setAttribute('aria-atomic', 'true');

    const assertive = document.createElement('div');
    assertive.className = 'visually-hidden';
    assertive.setAttribute('role', 'alert');

    document.body.append(polite, assertive);

    new window.MutationObserver(() => {
        const text = message.textContent.trim();
        if (!text) return;
        const region = toast.classList.contains('error') ? assertive : polite;
        region.textContent = '';
        setTimeout(() => { region.textContent = text; }, 50);
    }).observe(message, { childList: true, characterData: true, subtree: true });
}

setupMenu();
setupAccountMenu();
setupSignOut();
markCurrentPage();
setupPasswordToggles();
setupAnnouncer();
