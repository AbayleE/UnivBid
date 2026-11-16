import { Loaduserslistings } from '../components/ProductCard.js';
import { ProfilePicture } from '../components/AuthModal.js';
import { enableListingSearch } from '../services/search.js';
import { countActiveListings, fetchSellerSales } from '../services/api.js';
import { el, icon } from '../components/listingMeta.js';

// One stat tile: <li id> icon, <h2> label, value (with an optional unit).
function statTile(id, iconName, label, unit, note) {
    const tile = el('li', 'stat overview_div');
    tile.id = id;
    const badge = el('span', 'stat-icon');
    badge.append(icon(iconName));
    const text = el('div', 'title_container');
    const value = el('p', 'stat-value');
    if (unit) value.append(el('span', 'stat-unit', unit));
    const number = el('span', 'stat-number', '—');
    value.append(number);
    text.append(el('h2', 'stat-label', label), value);
    if (note) text.append(el('p', 'stat-note', note));
    tile.append(badge, text);
    return { tile, number };
}

document.addEventListener("DOMContentLoaded", () => {
    new ProfilePicture(document.getElementById("profile_pic"));

    const host = document.getElementById("dashboard-root") || document.querySelector("main") || document.body;

    // Heading
    const header = el('div', 'page-header header_lp');
    const headerText = el('div', 'header_lp_left');
    const title = el('h1', 'header_lp_title', 'Welcome back, ');
    const nameSpan = el('span', 'header_lp_subtitle', 'there');
    title.append(nameSpan);
    headerText.append(title, el('p', '', "Here's an overview of what you're selling."));
    const sell = el('a', 'btn btn-primary');
    sell.href = 'create_auction.html';
    sell.append(icon('fa-plus'), ' Sell an item');
    header.append(headerText, sell);

    // Stats
    const statsTitle = el('h2', 'visually-hidden', 'Overview');
    statsTitle.id = 'stats-title';
    const stats = el('ul', 'stat-grid content_box');
    stats.setAttribute('role', 'list');
    stats.setAttribute('aria-labelledby', 'stats-title');
    const earnings = statTile('total_earning', 'fa-euro-sign', 'Earnings', '€', "Online payments aren't live yet.");
    const sold = statTile('total_sold_items', 'fa-bag-shopping', 'Items sold');
    const active = statTile('total_active_listings', 'fa-store', 'Active listings');
    stats.append(earnings.tile, sold.tile, active.tile);

    // Listings
    const listings = el('section', 'dashboard-listings');
    listings.setAttribute('aria-labelledby', 'listings-heading');
    const toolbar = el('div', 'toolbar');
    const listingsHeading = el('h2', '', 'Your listings');
    listingsHeading.id = 'listings-heading';
    listingsHeading.tabIndex = -1;

    const search = el('div', 'search_bar');
    search.setAttribute('role', 'search');
    const searchLabel = el('label', 'visually-hidden', 'Filter your listings');
    searchLabel.htmlFor = 'dashboard-filter';
    const searchInput = el('input');
    searchInput.type = 'search';
    searchInput.id = 'dashboard-filter';
    searchInput.name = 'search_input';
    searchInput.placeholder = 'Filter your listings';
    searchInput.autocomplete = 'off';
    const searchButton = el('button');
    searchButton.type = 'button';
    searchButton.setAttribute('aria-label', 'Filter listings');
    searchButton.append(icon('fa-magnifying-glass'));
    search.append(searchLabel, searchInput, searchButton);

    const status = el('p', 'search-results-status');
    status.setAttribute('aria-live', 'polite');
    status.hidden = true;

    toolbar.append(listingsHeading, search);

    const listing_board = el('div', 'listing_board dashboard-list');
    listing_board.setAttribute('aria-labelledby', 'listings-heading');
    listings.append(toolbar, status, listing_board);

    host.append(header, statsTitle, stats, listings);
    enableListingSearch();

    const updateStats = async (products) => {
        // The loaded page is the fallback; Firestore counts the real total.
        active.number.textContent = String(products.filter((product) => product.status === "Available").length);
        const counted = await countActiveListings();
        if (counted.success) active.number.textContent = String(counted.active);

        const result = await fetchSellerSales();
        if (!result.success) return;

        sold.number.textContent = String(result.soldCount);
        if (result.soldCount === 0) {
            earnings.number.textContent = 'No sales yet';
            earnings.tile.classList.add('stat-empty');
        } else {
            earnings.number.textContent = (result.earningsCents / 100).toFixed(2);
            earnings.tile.classList.remove('stat-empty');
        }
    };

    new Loaduserslistings(listing_board, nameSpan, document.body, updateStats);
});
