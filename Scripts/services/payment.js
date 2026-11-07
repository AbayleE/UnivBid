export async function createCheckoutSession(checkoutData) {
    const stripeApiUrl = globalThis.UNIVBID_CONFIG?.stripeApiUrl;

    if (!stripeApiUrl) {
        throw new Error("Stripe checkout is not configured for this deployment.");
    }

    if (!checkoutData?.sellerStripeAccountId) {
        throw new Error("This seller has not connected a Stripe account.");
    }

    const response = await fetch(
        new URL("/api/stripe/create-checkout-session", stripeApiUrl),
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(checkoutData),
        }
    );

    const result = await response.json();
    if (!response.ok || !result.url) {
        throw new Error(result.error || "Unable to start checkout.");
    }

    window.location.assign(result.url);
}
