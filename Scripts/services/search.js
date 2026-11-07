export function enableListingSearch() {
    const input = document.querySelector(".search_bar input");
    const button = document.querySelector(".search_bar button");
    if (!input || !button) return;

    const updateResults = () => {
        const query = input.value.trim().toLocaleLowerCase();
        const listings = document.querySelectorAll(
            ".featured-card, .product_card, .product_card_list"
        );
        let visibleCount = 0;

        listings.forEach((listing) => {
            const matches = !query || listing.textContent.toLocaleLowerCase().includes(query);
            listing.hidden = !matches;
            if (matches) visibleCount += 1;
        });

        const status = document.querySelector(".search-results-status");
        if (status) {
            status.hidden = !query;
            status.textContent = visibleCount
                ? `${visibleCount} listing${visibleCount === 1 ? "" : "s"} match your search.`
                : "No listings match that search.";
        }
    };

    input.addEventListener("input", updateResults);
    button.addEventListener("click", updateResults);
    input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            updateResults();
        }
    });
}
