import { auth, onAuthStateChanged } from '../../firebase.js';
import { ProfilePicture } from '../components/AuthModal.js';
import { fetchProductById } from '../services/api.js';
import { signInUrl } from '../services/auth.js';
import { showNotification } from '../services/notifications.js';
import { formatPrice } from '../services/price.js';
import { categoryLabel, conditionLabel, el, icon, setListingImage } from '../components/listingMeta.js';

const SAVED_KEY = "cart"; // storage key kept as-is; shown to users as "Saved items"
const CACHE_KEY = "selected_item";

function showEmptyState(title, text) {
    const empty = document.getElementById("empty-listing-state");
    if (empty) {
        if (title) empty.querySelector('h1').textContent = title;
        if (text) empty.querySelector('p').textContent = text;
        empty.removeAttribute("hidden");
    }
    document.getElementById("listing-detail")?.setAttribute("hidden", "");
    document.querySelector(".left_container")?.setAttribute("hidden", "");
    document.querySelector(".right_container")?.setAttribute("hidden", "");
}

function listedDate(value) {
    const seconds = value?.seconds ?? value?._seconds;
    const date = seconds ? new Date(seconds * 1000) : (typeof value === 'string' ? new Date(value) : null);
    if (!date || Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function fact(list, term, value) {
    if (value === '' || value === null || value === undefined) return;
    const dt = el('dt', '', term);
    const dd = el('dd');
    if (typeof value === 'object') dd.append(value);
    else dd.textContent = String(value);
    list.append(dt, dd);
}

// The copy a card saved when it was clicked. Used for the first paint only.
function cachedListing(id) {
    try {
        const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY));
        if (!cached) return null;
        // Without an id in the URL (old bookmarks), the cache is all we have.
        return !id || cached.pid === id || cached.id === id ? cached : null;
    } catch {
        return null;
    }
}

function unitsLeft(product) {
    const quantity = parseInt(product.product_quantity, 10) || 0;
    return product.status === 'Available' ? Math.max(quantity, 0) : 0;
}

function render(product, { stale = false } = {}) {
    const left_container = document.querySelector(".left_container");
    const right_container = document.querySelector(".right_container");
    if (!left_container || !right_container) return;
    left_container.replaceChildren();
    right_container.replaceChildren();
    document.getElementById('listing-detail')?.querySelector('.description_div')?.remove();

    const name = product.name || 'Untitled listing';
    document.title = `${name} | UnivBid`;
    const available = unitsLeft(product);
    const maxQty = Math.max(1, available);
    const formatted = formatPrice(product.price);
    const sold = product.status !== 'Available' || available < 1;

    // Photo
    const figure = el('figure', 'image_div listing-photo');
    const image_ = el('img');
    image_.width = 800;
    image_.height = 600;
    setListingImage(image_, product.image, name);
    figure.append(image_);
    left_container.append(figure);

    // Summary
    const info = el('div', 'product_listing');

    const category = categoryLabel(product.categories);
    if (category) info.append(el('span', 'eyebrow', category));

    const title = el('h1', '', name);
    title.id = 'listing-title';

    const price = el('p', 'detail-price', formatted === 'N/A' ? 'Price not set' : `€${formatted}`);
    price.id = "price";

    const facts = el('dl', 'detail-facts');
    if (product.condition) fact(facts, 'Condition', el('span', 'badge badge-primary', conditionLabel(product.condition)));
    fact(facts, 'Available', sold ? 'Sold out' : `${available}`);
    fact(facts, 'Seller', product.soldBy_name || 'A student');
    fact(facts, 'Listed', listedDate(product.dateListed));

    info.append(title, price, facts);

    // Actions
    const box = el('div', 'card purchase-box');

    if (sold) {
        const banner = el('div', 'notice notice-warning');
        banner.id = 'sold-banner';
        const text = el('p');
        text.append(el('strong', '', 'This item has been sold. '), 'Browse the marketplace for similar listings.');
        banner.append(icon('fa-circle-check'), text);
        const browse = el('a', 'btn btn-primary btn-lg btn-block', 'Browse listings');
        browse.href = 'sales_page.html';
        box.append(banner, browse);
    } else {
        const qtyField = el('div', 'field qty-field');
        const qty_label = el('label', '', 'Quantity');
        qty_label.htmlFor = 'qty_input';
        const qty_input = el('input', 'qty_input');
        qty_input.id = 'qty_input';
        qty_input.type = "number";
        qty_input.min = 1;
        qty_input.max = maxQty;
        qty_input.step = 1;
        qty_input.value = 1;
        qty_input.inputMode = 'numeric';
        const qtyError = el('p', 'field-error');
        qtyError.id = 'qty_input-error';
        qty_input.setAttribute('aria-describedby', qtyError.id);
        qtyField.append(qty_label, qty_input, qtyError);
        qtyField.hidden = maxQty <= 1;

        const button_buynow = el('button', 'btn btn-primary btn-lg btn-block CTA_button');
        button_buynow.type = 'button';
        button_buynow.id = "buynow";
        button_buynow.append(icon('fa-envelope'), ' Contact seller');

        const button_addtocart = el('button', 'btn btn-secondary btn-lg btn-block CTA_button');
        button_addtocart.type = 'button';
        button_addtocart.id = "addtocart";
        button_addtocart.append(icon('fa-bookmark'), ' Save item');

        const notice = el('div', 'notice');
        const noticeText = el('p');
        noticeText.append(el('strong', '', "Payments aren't online yet. "),
            "Contacting the seller doesn't charge you anything. You'll agree payment and pickup together.");
        notice.append(icon('fa-circle-info'), noticeText);

        box.append(qtyField, button_buynow, button_addtocart, notice);

        const readQty = () => {
            const value = Number(qty_input.value);
            const valid = Number.isInteger(value) && value >= 1 && value <= maxQty;
            qtyError.textContent = valid ? '' : `Choose a number from 1 to ${maxQty}.`;
            if (valid) qty_input.removeAttribute('aria-invalid');
            else qty_input.setAttribute('aria-invalid', 'true');
            return valid ? value : null;
        };
        qty_input.addEventListener('input', readQty);

        button_addtocart.addEventListener("click", () => {
            const cart = JSON.parse(localStorage.getItem(SAVED_KEY)) || [];
            const existing = cart.find(item => item.pid === product.pid);

            if (existing) {
                if (existing.quantity < available) {
                    existing.quantity += 1;
                } else {
                    showNotification("You've already saved the most this seller has available.");
                    return;
                }
            } else {
                cart.push({ ...product, quantity: 1 });
            }

            localStorage.setItem(SAVED_KEY, JSON.stringify(cart));
            showNotification("Saved. You'll find it under Saved items.", 'success');
        });

        button_buynow.addEventListener("click", () => {
            if (stale) return; // Still loading the live copy.
            const qty = readQty();
            if (qty === null) {
                qty_input.focus();
                return;
            }
            // Only the id travels. The checkout page loads the listing again.
            sessionStorage.setItem("buy_now_item", JSON.stringify({ productId: product.pid, quantity: qty }));
            window.location.href = `checkout.html?id=${encodeURIComponent(product.pid)}`;
        });
    }

    // Description
    const description_div = el('section', 'description_div');
    description_div.setAttribute('aria-labelledby', 'description-title');
    const description_label = el('h2', '', 'Description');
    description_label.id = 'description-title';
    const product_desc = el('p', 'detail-description', product.description || 'No description provided.');
    description_div.append(description_label, product_desc);

    right_container.append(info, box);
    // Last in reading order (photo, summary, description); CSS places it
    // under the photo on wide screens.
    (document.getElementById('listing-detail') || left_container).append(description_div);
}

document.addEventListener("DOMContentLoaded", () => {
    new ProfilePicture(document.getElementById("profile_pic"));

    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const cached = cachedListing(id);

    if (!id && !cached) {
        showEmptyState();
        return;
    }

    // Instant paint from the cached copy while the live listing loads.
    if (cached) render(cached, { stale: Boolean(id) });

    const listingId = id || cached.pid;
    if (id && cached?.pid === id) {
        // Normalise the address bar, so copying it always yields the id link.
        window.history.replaceState(null, '', `product_listing_page.html?id=${encodeURIComponent(id)}`);
    }

    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            if (!cached) window.location.replace(signInUrl());
            return;
        }

        const result = await fetchProductById(listingId);
        if (!result.success) {
            if (!cached) showEmptyState('Listing unavailable', 'We could not load this listing. Please try again.');
            return;
        }

        if (!result.product) {
            showEmptyState('Listing not found', 'This listing has been removed or the link is wrong.');
            return;
        }

        sessionStorage.setItem(CACHE_KEY, JSON.stringify(result.product));
        render(result.product);
    });
});
