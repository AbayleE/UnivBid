import { ProfilePicture } from '../components/AuthModal.js';
import { formatPrice } from '../services/price.js';
import { showNotification } from '../services/notifications.js';
import { conditionLabel, createEmptyState, el, icon, linkButton, setListingImage } from '../components/listingMeta.js';

// "Saved items": the list stored in this browser (localStorage key "cart").
const SAVED_KEY = "cart";

const readSaved = () => {
    try {
        return JSON.parse(localStorage.getItem(SAVED_KEY)) || [];
    } catch {
        return [];
    }
};

document.addEventListener("DOMContentLoaded", () => {
    new ProfilePicture(document.getElementById("profile_pic"));

    const container = document.getElementById("card_container");
    if (!container) return;
    let saved = readSaved();

    function render(focusIndex) {
        if (saved.length === 0) {
            container.replaceChildren(createEmptyState({
                iconName: 'fa-bookmark',
                title: 'No saved items yet',
                text: 'Tap "Save item" on a listing to keep it here for later.',
                action: linkButton('sales_page.html', 'Browse listings'),
            }));
            return;
        }

        const rows = saved.map((product, index) => {
            const name = product.name || 'Untitled listing';
            const row = el('div', 'cart-item');
            row.setAttribute('role', 'listitem');

            const img = el('img', 'row-thumb');
            img.width = 80;
            img.height = 80;
            img.loading = 'lazy';
            setListingImage(img, product.image, name);

            const info = el('div', 'cart-info');
            const title = el('h2', 'row-title');
            const link = el('a', '', name);
            link.href = `product_listing_page.html?id=${encodeURIComponent(product.pid || '')}`;
            const remember = () => sessionStorage.setItem("selected_item", JSON.stringify(product));
            ['click', 'auxclick', 'contextmenu'].forEach((type) => link.addEventListener(type, remember));
            title.append(link);

            const meta = el('p', 'row-meta');
            if (product.condition) meta.append(el('span', 'badge', conditionLabel(product.condition)));
            meta.append(el('span', '', `Saved: ${product.quantity}`));
            if (product.soldBy_name) meta.append(el('span', '', `Seller: ${product.soldBy_name}`));
            info.append(title, meta);

            const formatted = formatPrice(product.price);
            const price = el('p', 'row-price', formatted === 'N/A' ? 'Price not set' : `€${formatted}`);

            const actions = el('div', 'row-actions button_div');
            const remove = el('button', 'btn btn-danger-outline btn-sm remove-btn');
            remove.type = 'button';
            remove.append(icon('fa-trash-can'), ' Remove');
            remove.setAttribute('aria-label', `Remove ${name} from saved items`);
            remove.addEventListener("click", () => {
                saved.splice(index, 1);
                localStorage.setItem(SAVED_KEY, JSON.stringify(saved));
                showNotification(`Removed ${name} from saved items.`, 'success');
                render(Math.min(index, saved.length - 1));
            });
            actions.append(remove);

            row.append(img, info, price, actions);
            return row;
        });

        container.replaceChildren(...rows);

        // Keep keyboard focus in the list after removing an item.
        if (focusIndex !== undefined && focusIndex >= 0) {
            container.querySelectorAll('.remove-btn')[focusIndex]?.focus();
        }
    }

    render();
});
