import { ProfilePicture } from '../components/AuthModal.js';
import { getallProducts } from '../components/ProductCard.js';
import { enableListingSearch } from '../services/search.js';
import { renderSkeletonCards } from '../components/listingMeta.js';

document.addEventListener("DOMContentLoaded", function () {
    enableListingSearch();
    new ProfilePicture(document.getElementById("profile_pic"));

    const host = document.getElementById("browse-results") || document.querySelector("main") || document.body;

    const listing_board = document.createElement("div");
    listing_board.className = "listing_board is-grid";
    listing_board.setAttribute("aria-labelledby", "browse-title");
    renderSkeletonCards(listing_board, 6);
    host.appendChild(listing_board);

    new getallProducts(listing_board);
});
