import 'dotenv/config';

const REQUIRED_VARIABLES = ['STRIPE_SK', 'STRIPE_WEBHOOK_SECRET', 'DOMAIN', 'FIREBASE_PROJECT_ID'];

const missing = REQUIRED_VARIABLES.filter((name) => !process.env[name]);
if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

// Throws on a malformed DOMAIN, so a bad value stops startup.
const frontendOrigin = new URL(process.env.DOMAIN).origin;

export const env = {
  stripeSecretKey: process.env.STRIPE_SK,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  frontendOrigin,
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
  port: process.env.PORT || 5000,
};
