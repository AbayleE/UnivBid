import 'dotenv/config';

const REQUIRED_VARIABLES = ['STRIPE_SK', 'STRIPE_WEBHOOK_SECRET', 'DOMAIN', 'FIREBASE_PROJECT_ID'];

const missing = REQUIRED_VARIABLES.filter((name) => !process.env[name]);
if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

// Throws on a malformed DOMAIN, so a bad value stops startup.
const frontendOrigin = new URL(process.env.DOMAIN).origin;

const integer = (name, fallback, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) => {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max} (received ${raw})`);
  }
  return value;
};

const currency = (process.env.CURRENCY || 'eur').toLowerCase();
if (!/^[a-z]{3}$/.test(currency)) {
  throw new Error(`CURRENCY must be a three-letter ISO code (received ${process.env.CURRENCY})`);
}

export const env = {
  stripeSecretKey: process.env.STRIPE_SK,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  // Connect account events arrive on their own endpoint with their own secret.
  stripeConnectWebhookSecret: process.env.STRIPE_CONNECT_WEBHOOK_SECRET || null,
  // Orders record which mode created them, and events from the other mode are ignored.
  livemode: process.env.STRIPE_SK.startsWith('sk_live_'),
  frontendOrigin,
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
  port: process.env.PORT || 5000,
  currency,
  platformFeePercent: integer('PLATFORM_FEE_PERCENT', 5, { min: 0, max: 50 }),
  platformFeeMinCents: integer('PLATFORM_FEE_MIN_CENTS', 50, { min: 0, max: 100000 }),
  isProduction: process.env.NODE_ENV === 'production',
};
