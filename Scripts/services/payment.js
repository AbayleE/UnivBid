import { auth } from "../../firebase.js";

const apiUrl = () => globalThis.UNIVBID_CONFIG?.stripeApiUrl;

// Only the listing id is sent. The server reads the price and the seller's
// payout account from Firestore, and identifies the buyer by the ID token.
async function post(path, body) {
    const base = apiUrl();
    if (!base) throw new Error("Online payments are not configured for this deployment.");

    const user = auth.currentUser;
    if (!user) throw new Error("Please sign in first.");
    const token = await user.getIdToken();

    const response = await fetch(new URL(path, base), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body ?? {}),
    });

    let result = {};
    try { result = await response.json(); } catch { /* non-JSON error page */ }
    if (!response.ok) throw new Error(result.error || "The payment service is unavailable.");
    return result;
}

export async function createCheckoutSession(productId) {
    const result = await post("/api/stripe/create-checkout-session", { productId });
    if (!result.url) throw new Error("Unable to start checkout.");
    window.location.assign(result.url);
}

// Seller onboarding: Stripe hosts the form and returns to connect_return.html.
export async function startSellerOnboarding() {
    const result = await post("/api/stripe/connect/onboard");
    if (!result.url) throw new Error("Unable to start onboarding.");
    window.location.assign(result.url);
}

export async function fetchSellerStatus() {
    const base = apiUrl();
    const user = auth.currentUser;
    if (!base || !user) return null;
    const token = await user.getIdToken();
    const response = await fetch(new URL("/api/stripe/connect/status", base), {
        headers: { Authorization: `Bearer ${token}` },
    });
    return response.ok ? response.json() : null;
}
