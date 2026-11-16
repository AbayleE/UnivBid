// Display helpers for listings. UI only: stored values are unchanged,
// these functions only decide how they are shown.

export const PLACEHOLDER_IMAGE = 'Images/placeholder-listing.svg';

// Stored values must match firestore.rules exactly. Labels are for display.
export const CONDITIONS = [
    { value: 'New', label: 'New' },
    { value: 'Like New', label: 'Like new' },
    { value: 'Fairly Good', label: 'Fairly good' },
    { value: 'Used', label: 'Used' },
    { value: 'Heavily Used', label: 'Heavily used' },
];

const CATEGORY_LABELS = [
    'Electronics',
    'Fashion',
    'Books',
    'Home & Kitchen',
    'Sports & Outdoors',
    'Toys & Games',
    'Health & Beauty',
    'Automotive',
    'Art & Collectibles',
    'Other',
];

// Same slug format the create form has always stored, e.g. "home-kitchen".
const slug = (label) => label.toLowerCase().replace(/ & /g, '-').replace(/\s+/g, '-');

export const CATEGORIES = CATEGORY_LABELS.map((label) => ({ value: slug(label), label }));

export const LIMITS = { name: 120, description: 2000, quantityMax: 999999 };

export function conditionLabel(value) {
    return CONDITIONS.find((c) => c.value === value)?.label || value || '';
}

export function categoryLabel(value) {
    return CATEGORIES.find((c) => c.value === value)?.label || '';
}

// Sets an image source with a placeholder for blank or broken URLs.
// Only HTTPS image URLs are shown. The Firestore rules restrict new
// listings to Cloudinary; this guards older listings and the saved-items copy.
export function setListingImage(img, src, name) {
    const url = typeof src === 'string' && /^https:\/\//.test(src.trim()) ? src.trim() : '';
    img.src = url || PLACEHOLDER_IMAGE;
    img.alt = name ? `Photo of ${name}` : 'Listing photo';
    img.addEventListener('error', () => {
        if (!img.src.endsWith(PLACEHOLDER_IMAGE)) img.src = PLACEHOLDER_IMAGE;
    }, { once: true });
}

// Small element helper: el('p', 'class names', 'text').
export function el(tag, className = '', text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
}

export function icon(name) {
    const i = el('i', `fa-solid ${name}`);
    i.setAttribute('aria-hidden', 'true');
    return i;
}

export function renderSkeletonCards(container, count = 6) {
    const cards = [];
    for (let i = 0; i < count; i += 1) {
        const card = el('div', 'skeleton-card');
        card.setAttribute('aria-hidden', 'true');
        const lines = el('div', 'skeleton-lines');
        lines.append(el('div', 'skeleton skeleton-line w-80'), el('div', 'skeleton skeleton-line h-lg w-40'),
            el('div', 'skeleton skeleton-line w-60'));
        card.append(el('div', 'skeleton skeleton-media'), lines);
        cards.push(card);
    }
    container.replaceChildren(...cards);
}

export function renderSkeletonRows(container, count = 3) {
    const rows = [];
    for (let i = 0; i < count; i += 1) {
        const row = el('div', 'skeleton-row');
        row.setAttribute('aria-hidden', 'true');
        const lines = el('div', 'skeleton-lines');
        lines.append(el('div', 'skeleton skeleton-line w-60'), el('div', 'skeleton skeleton-line w-40'));
        row.append(el('div', 'skeleton skeleton-thumb'), lines);
        rows.push(row);
    }
    container.replaceChildren(...rows);
}

// Empty and error states share one layout.
export function createEmptyState({ iconName, title, text, action, isError = false }) {
    const box = el('div', `empty-state${isError ? ' is-error' : ''}`);
    const badge = el('span', 'empty-state-icon');
    badge.append(icon(iconName));
    box.append(badge, el('h2', '', title), el('p', '', text));
    if (action) box.append(action);
    return box;
}

export function linkButton(href, text, className = 'btn btn-primary') {
    const a = el('a', className, text);
    a.href = href;
    return a;
}
