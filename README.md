# UnivBid

UnivBid is a student-focused marketplace prototype for discovering and listing campus essentials. The landing page includes clearly labeled sample listings so visitors can explore the product concept without creating an account.

## Project highlights

- Consistent, responsive UI across the public and authenticated app pages
- Email/password authentication and profile management with Firebase
- Firestore-backed product listing workflows
- A public landing page with sample content for portfolio demonstrations
- An Express/Stripe backend scaffold for future payment integration

## Tech stack

- Frontend: HTML, CSS, JavaScript modules
- Authentication and data: Firebase Auth and Firestore
- Backend: Node.js and Express
- Payments: Stripe API scaffold

## Demo status

Sample listings on the landing page are illustrative and are not loaded from Firestore. The application does not currently implement live bidding or a complete buyer-to-seller payment flow. Stripe checkout requires a configured API URL and a seller's connected Stripe account; do not use this prototype to accept real payments.

## Project structure

```text
UnivBid/
├── index.html
├── sign_in.html
├── sign_up.html
├── dashboard.html
├── sales_page.html
├── create_auction.html
├── profile.html
├── checkout.html
├── firebase.js
├── Scripts/
│   ├── components/
│   ├── pages/
│   └── services/
├── Styles/
├── Images/
├── stripe-backend/
└── package.json
```

## Run locally

1. Clone the repository and install dependencies:

```bash
git clone https://github.com/AbayleE/UnivBid.git
cd UnivBid
npm install
```

2. Serve the frontend from the repository root:

```bash
python -m http.server 8000
```

3. Open `http://localhost:8000`.

The public landing page can be viewed without signing in. Account, listing, and dashboard workflows require a working Firebase project and authenticated user.

To start the optional Stripe API, configure the environment first, then run `npm start`:

```text
stripe-backend/.env
STRIPE_SK=your_stripe_secret_key
DOMAIN=https://your-frontend-domain.example
FIREBASE_PROJECT_ID=your_firebase_project_id
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/outside/the/repo/service-account.json
```

The API requires a Firebase ID token (`Authorization: Bearer <token>`) and a JSON body of `{ "productId": "..." }`. It reads the price from `products/{productId}` and the payout account from `sellerStripeAccountId` on the seller's `users/{uid}` document. Only trusted server code may set that field.

The frontend payment helper also expects `window.UNIVBID_CONFIG.stripeApiUrl` to point to the deployed API. Keep Stripe secret keys on the server only. Stripe Connect onboarding, payment verification, and success/cancel pages must be completed before enabling real transactions.

## Deployment checklist

- Host the static frontend over HTTPS and configure the Firebase Auth authorized domain.
- Review Firebase API-key restrictions and Firestore security rules for the intended public app.
- Configure the Stripe backend environment separately from the static frontend.
- Test account, listing, and mobile flows against the production Firebase project.
- Keep sample listings clearly identified as sample content.

## License

This project is for educational and portfolio demonstration purposes.
