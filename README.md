# UnivBid

UnivBid is a marketplace prototype where university students list and browse campus essentials. Sellers create listings with photos, buyers browse what's new, and a secured Node backend is ready to take Stripe payments once seller onboarding is added.

**Live demo:** _add your Firebase Hosting URL here after deploying_

## Features

- **Accounts:** email and password sign-up with Firebase Auth. A failed profile save removes the half-created account so the email can be reused.
- **Listings:** create a listing with a photo (uploaded to Cloudinary), then edit or delete it from your dashboard.
- **Browse:** newest listings first, 12 at a time, with Load more.
- **Dashboard:** active listings, items sold and earnings. Sales totals are computed by Firestore rather than downloaded.
- **Profile:** edit your details and contact preferences.
- **Security:**
  - Firestore rules deny everything by default and validate every listing field.
  - User content is rendered as text, never HTML.
  - Only the server can set payout accounts or record orders.
- **Payments backend:** the checkout endpoint takes only a product ID and reads the price and payout account from the database. A signed Stripe webhook records each sale exactly once.

## Status

This is a portfolio project, not a live marketplace.

- **Online payments aren't switched on.** The backend is built and tested, but buyers have no pay button yet and sellers have no Stripe onboarding, so "Buy now" leads to a contact form. Don't use this to take real money.
- **The home page shows sample listings,** labelled as samples. They aren't loaded from Firestore.
- **There's no bidding,** despite the name.

## Tech stack

| Area | Technology |
|---|---|
| Frontend | HTML, CSS, vanilla JavaScript modules (no build step) |
| Auth and data | Firebase Auth, Cloud Firestore |
| Images | Cloudinary (unsigned upload preset) |
| Backend | Node.js 22, Express 5, Firebase Admin SDK |
| Payments | Stripe Checkout with Connect destination charges |
| Webhooks | [`@efrata/hookguard`](https://github.com/AbayleE/hookGuard) for signature verification |
| Tests | Node's built-in test runner, jsdom |

## Project structure

```text
UnivBid/
├── *.html                    Pages (index, sign_in, dashboard, sales_page, ...)
├── firebase.js               Firebase client setup
├── Scripts/
│   ├── components/           Listing cards, auth and profile widgets
│   ├── pages/                One script per page
│   └── services/             Firestore calls, prices, uploads, notifications
├── Styles/                   Stylesheets
├── Images/                   Static images
├── stripe-backend/
│   ├── config/               Environment checks, Firebase Admin and Stripe clients
│   ├── controllers/          Checkout and webhook handlers
│   ├── middleware/           Firebase ID token check
│   ├── routes/               API routes and rate limiting
│   └── scripts/              One-off data migrations
├── tests/                    Backend and frontend tests
├── firestore.rules           Security rules
├── firestore.indexes.json    Composite indexes
└── firebase.json             Firebase deploy configuration
```

## Run locally

You need **Node.js 22.3 or later**.

```bash
git clone https://github.com/AbayleE/UnivBid.git
cd UnivBid
npm install
npm test
```

### Frontend

Serve the repository root with any static server, then open the printed address:

```bash
python -m http.server 8000
```

The VS Code Live Server extension also works (this repo sets it to port 5502).

The frontend connects to the real Firebase project in `firebase.js`, so **anything you create locally is saved to that project's live database.** To use your own project, replace the config in `firebase.js` and deploy the rules and indexes to it (see Deploy).

### Backend (optional)

You only need the backend to work on payments. Create `stripe-backend/.env`:

```text
STRIPE_SK=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
DOMAIN=http://localhost:8000
FIREBASE_PROJECT_ID=bidsphere-a55b1
```

Give the backend Google credentials using one of these:
- **Recommended:** run `gcloud auth application-default login` once.
- **Or:** set `GOOGLE_APPLICATION_CREDENTIALS` to a service account key stored outside the repo.

Then run:

```bash
npm start                 # or: npm run dev   (restarts on changes)
```

The server stops with a clear message if a required variable is missing.

`@efrata/hookguard` is installed from `vendor/efrata-hookguard-0.1.0-beta.0.tgz`, the same file `npm publish` uploads. Once the beta is on npm, switch to it and delete the `vendor/` folder:

```bash
npm install @efrata/hookguard@beta
```

To receive Stripe webhooks locally, run this in a second terminal and copy the printed `whsec_...` value into `STRIPE_WEBHOOK_SECRET`:

```bash
stripe listen --forward-to localhost:5000/api/stripe/webhook --events checkout.session.completed
```

### API

| Endpoint | Auth | Purpose |
|---|---|---|
| `POST /api/stripe/create-checkout-session` | `Authorization: Bearer <Firebase ID token>` | Body `{ "productId": "..." }`. Reads the price from `products/{id}` and the payout account from the seller's `users/{uid}.sellerStripeAccountId`. Limited to 10 requests per minute per user. |
| `POST /api/stripe/webhook` | Stripe signature, checked by [HookGuard](https://github.com/AbayleE/hookGuard) | Forged, altered or replayed requests get a 401. On a paid `checkout.session.completed`, creates `orders/{sessionId}` and reduces the listing's quantity. A listing is marked `Sold` at zero. If the item was already gone, the order is saved as `needs_refund` for a manual refund. |

## Deploy

The site deploys to **Firebase Hosting**. The backend is optional until payments are switched on.

Install the Firebase CLI and sign in once:

```bash
npm install -g firebase-tools
firebase login
```

Run these steps in order, because each step depends on the one before:

1. **Indexes.** Browse needs the index, so wait until it shows as *Enabled* in the Firebase console before going on:
   ```bash
   firebase deploy --only firestore:indexes
   ```
2. **Site.** The site appears at `https://bidsphere-a55b1.web.app`:
   ```bash
   firebase deploy --only hosting
   ```
3. **Price migration.** Older listings store prices as text. This step converts them to numbers. It uses the backend credentials above. Check the dry run's output before adding `--apply`:
   ```bash
   node stripe-backend/scripts/migrate_prices.js
   node stripe-backend/scripts/migrate_prices.js --apply
   ```
4. **Rules.** Deploy them last: they reject listings with text prices, which the old site still sends. Test them in the console's Rules Playground first:
   ```bash
   firebase deploy --only firestore:rules
   ```

**Firebase Auth** already allows the `web.app` and `firebaseapp.com` domains. If you add a custom domain, add it under **Authentication > Settings > Authorized domains**.

### Backend (when payments are ready)

Google Cloud Run is the simplest option, because it runs inside your Firebase project and gets Firestore access without a key file:

```bash
gcloud run deploy univbid-api --source . --region europe-west1 \
  --set-env-vars DOMAIN=https://bidsphere-a55b1.web.app,FIREBASE_PROJECT_ID=bidsphere-a55b1 \
  --set-secrets STRIPE_SK=stripe-sk:latest,STRIPE_WEBHOOK_SECRET=stripe-webhook-secret:latest
```

Store both Stripe values in Secret Manager first. In the Stripe Dashboard, under **Developers > Webhooks**, add `https://<your-cloud-run-url>/api/stripe/webhook` with the `checkout.session.completed` event, and use that endpoint's signing secret.

## What's next

[codebase-analysis-docs/portfolio_next_steps.md](codebase-analysis-docs/portfolio_next_steps.md) lists the remaining work in priority order. The full security and quality audit behind it is in [codebase-analysis-docs/firebase_app_audit.md](codebase-analysis-docs/firebase_app_audit.md).

## License

This project is for educational and portfolio demonstration purposes.
