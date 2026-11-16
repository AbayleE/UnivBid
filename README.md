# UnivBid

A marketplace prototype where university students list and browse campus essentials.

**Live demo:** _add your Firebase Hosting URL here after deploying_

## Features

- Sign up and sign in with Firebase Auth
- Create listings with a photo, and edit or delete them from your dashboard
- Browse the newest listings, 12 at a time
- Dashboard with active listings, items sold and earnings
- Shareable listing links (`product_listing_page.html?id=...`) that stay readable after the item sells
- Secure by default: Firestore rules validate every write (listings and profiles), images must come from Cloudinary, and user content is never rendered as HTML
- Payments backend with server-side pricing, a unit reservation per checkout, verified Stripe webhooks, automatic refunds for oversold items, and Stripe Connect seller onboarding

## Status

This is a portfolio project, not a live marketplace:

- **Online payments aren't switched on yet.** The backend is complete and tested (checkout, seller onboarding with Stripe Connect, reservations, refunds and result pages), but the listing page still shows "Contact seller", which opens a message form that is a preview and doesn't send yet. Switching payments on means deploying the backend, setting `UNIVBID_CONFIG.stripeApiUrl` on the site and replacing that button.
- **The home page shows sample listings,** labelled as samples.
- **There's no bidding,** despite the name.

## Tech stack

| Area | Technology |
|---|---|
| Frontend | HTML, CSS, vanilla JavaScript modules (no build step) |
| Auth and data | Firebase Auth, Cloud Firestore |
| Images | Cloudinary |
| Backend | Node.js 22, Express 5, Firebase Admin SDK |
| Payments | Stripe Checkout, [`@efrata/hookguard`](https://github.com/AbayleE/hookGuard) for webhooks |
| Tests | Node's built-in test runner, jsdom |

## Start the app

You need [Node.js 22.3+](https://nodejs.org) and [Python 3](https://www.python.org).

1. Get the code and install dependencies:
   ```bash
   git clone https://github.com/AbayleE/UnivBid.git
   cd UnivBid
   npm install
   ```
2. Check everything works. All tests should pass:
   ```bash
   npm test
   ```
3. Start the website:
   ```bash
   python -m http.server 8000
   ```
4. Open [http://localhost:8000](http://localhost:8000).
5. Click **Sign Up** to create an account. You can then create listings, browse and use the dashboard.

Press `Ctrl+C` in the terminal to stop the server.

Notes:
- **Use the server.** Opening the HTML files directly by double-clicking won't work, because browsers block JavaScript modules loaded from files.
- **Live database:** the site uses the live Firebase project set in `firebase.js`, so anything you create is saved there. To use your own project, replace that config and deploy the rules and indexes (see Deploy).

## Start the payments backend (optional)

You only need this to work on payments.

1. Create `stripe-backend/.env`, using your Stripe test keys:
   ```text
   STRIPE_SK=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   DOMAIN=http://localhost:8000
   FIREBASE_PROJECT_ID=bidsphere-a55b1
   ```
   Optional settings and their defaults:
   ```text
   STRIPE_CONNECT_WEBHOOK_SECRET=whsec_...   # enables /api/stripe/connect/webhook
   PLATFORM_FEE_PERCENT=5                     # share of each sale kept by the platform
   PLATFORM_FEE_MIN_CENTS=50                  # floor for the fee; never the whole price
   CURRENCY=eur
   NODE_ENV=production                        # hides error details in responses
   ```
2. Sign in to Google Cloud so the backend can reach Firestore:
   ```bash
   gcloud auth application-default login
   ```
3. Start the backend on port 5000:
   ```bash
   npm start
   ```
4. To receive Stripe webhooks, run this in a second terminal. Put the `whsec_...` value it prints into `STRIPE_WEBHOOK_SECRET`, then restart `npm start`:
   ```bash
   stripe listen --forward-to localhost:5000/api/stripe/webhook --events checkout.session.completed,checkout.session.expired,charge.refunded,charge.dispute.created
   ```
   For seller onboarding, forward Connect events to the second endpoint in a third terminal and put its secret into `STRIPE_CONNECT_WEBHOOK_SECRET`:
   ```bash
   stripe listen --forward-connect-to localhost:5000/api/stripe/connect/webhook --events account.updated
   ```

The backend has two endpoints:

| Endpoint | Purpose |
|---|---|
| `POST /api/stripe/create-checkout-session` | Needs a Firebase ID token and `{ "productId": "..." }`. The price and seller account are read from Firestore, never from the request. Reserves one unit for the length of the session. |
| `POST /api/stripe/connect/onboard` | Creates the seller's Stripe Express account on first use and returns a fresh onboarding link. |
| `GET /api/stripe/connect/status` | Asks Stripe whether the seller can accept payments. `connect_return.html` calls it. |
| `POST /api/stripe/webhook` | Records each paid order once, consumes the reservation and updates the listing's quantity. Refunds a payment for an item that was sold meanwhile. Releases reservations on expiry and marks refunded or disputed orders. Requests without a valid Stripe signature get a 401. |
| `POST /api/stripe/connect/webhook` | `account.updated` events, with their own signing secret. Updates whether the seller can be paid. Mounted only when the secret is set. |

Every endpoint is rate limited per IP, and the authenticated ones per user as well. Webhook events are claimed once in the `webhook_events` collection, so retries and parallel instances cannot process an event twice.

## Deploy

The website goes to Firebase Hosting. Install the Firebase CLI once:

```bash
npm install -g firebase-tools
firebase login
```

Then run these steps in order:

1. **Indexes.** Wait until the index shows as *Enabled* in the Firebase console before continuing:
   ```bash
   firebase deploy --only firestore:indexes
   ```
2. **Website.** It will be live at `https://bidsphere-a55b1.web.app`:
   ```bash
   firebase deploy --only hosting
   ```
3. **Price migration** (one time). Converts old text prices to numbers. It needs the backend setup above. Check the dry run's output before adding `--apply`:
   ```bash
   node stripe-backend/scripts/migrate_prices.js
   node stripe-backend/scripts/migrate_prices.js --apply
   ```
4. **Security rules.** Test them in the Firebase console's Rules Playground first. The rules now validate profile fields too, so a profile missing a field will fail to update until it is saved from the profile page once:
   ```bash
   firebase deploy --only firestore:rules
   ```
5. **Firestore TTL.** In the Firebase console, add a time-to-live policy on `webhook_events` using the `expiresAt` field, so processed webhook claims are cleaned up after 30 days.

The backend only needs deploying once payments are switched on. Google Cloud Run works well, because it can reach Firestore without a key file.

## Project structure

```text
*.html                 Pages
firebase.js            Firebase client setup
Scripts/               Page scripts, components and services
Styles/                Stylesheets
Images/                Static images
stripe-backend/        Express API, webhook handler and migration script
tests/                 Backend and frontend tests
vendor/                HookGuard package, until it's published to npm
firestore.rules        Security rules
firestore.indexes.json Database indexes
firebase.json          Firebase deploy configuration
```

## Roadmap

- Online payments: the pay button on the listing page, and deploying the backend. Onboarding, reservations, refunds and the result pages are done.
- Enforce email verification: a verification email is sent at sign-up; the rule that requires it before listing is one line once existing accounts have verified
- Seller messaging, so "Contact seller" actually reaches the seller
- Bidding: an `auctions` collection with a server-side bid endpoint
- Continuous integration and Firestore rules tests against the emulator
- A sweep for reservations whose `checkout.session.expired` webhook never arrived

## License

This project is for educational and portfolio demonstration purposes.
