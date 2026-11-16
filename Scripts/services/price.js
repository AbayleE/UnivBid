const MAX_PRICE = 9999999.99;

// Returns the price as a number rounded to cents, or null if it is not a valid price.
export function parsePrice(value) {
    if (typeof value === "string" && value.trim() === "") return null;

    const price = Math.round(Number(value) * 100) / 100;
    return Number.isFinite(price) && price > 0 && price <= MAX_PRICE ? price : null;
}

// Accepts numbers and the string prices on older listings.
export function formatPrice(value) {
    const price = parsePrice(value);
    return price === null ? "N/A" : price.toFixed(2);
}
