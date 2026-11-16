import { db, stripe } from '../config/clients.js';
import { env } from '../config/env.js';

const userRef = (uid) => db.collection('users').doc(uid);

// Creates the seller's Express account on first use, then returns a fresh
// Account Link. Links expire within minutes, so one is made per click and
// never stored. The account id is written here with the Admin SDK: the
// Firestore rules stop clients from setting it.
export const handleConnectOnboard = async (req, res) => {
  const { uid } = req.user;
  const profile = (await userRef(uid).get()).data();
  if (!profile) return res.status(404).json({ error: 'Complete your profile before selling online' });

  let accountId = profile.sellerStripeAccountId;

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      email: typeof profile.email === 'string' ? profile.email : undefined,
      capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
      metadata: { uid },
    });
    accountId = account.id;

    const batch = db.batch();
    batch.update(userRef(uid), {
      sellerStripeAccountId: accountId,
      stripeChargesEnabled: false,
      stripePayoutsEnabled: false,
    });
    batch.set(db.collection('stripe_accounts').doc(accountId), { uid, createdAt: new Date() });
    await batch.commit();
  }

  const link = await stripe.accountLinks.create({
    account: accountId,
    type: 'account_onboarding',
    refresh_url: `${env.frontendOrigin}/connect_return.html?refresh=1`,
    return_url: `${env.frontendOrigin}/connect_return.html`,
  });

  res.json({ url: link.url });
};

// The return redirect is not proof of completion, so the page asks Stripe.
export const handleConnectStatus = async (req, res) => {
  const { uid } = req.user;
  const profile = (await userRef(uid).get()).data();
  const accountId = profile?.sellerStripeAccountId;

  if (!accountId) return res.json({ connected: false, chargesEnabled: false, payoutsEnabled: false });

  const account = await stripe.accounts.retrieve(accountId);
  const chargesEnabled = account.charges_enabled === true;
  const payoutsEnabled = account.payouts_enabled === true;

  if (profile.stripeChargesEnabled !== chargesEnabled || profile.stripePayoutsEnabled !== payoutsEnabled) {
    await userRef(uid).update({ stripeChargesEnabled: chargesEnabled, stripePayoutsEnabled: payoutsEnabled });
  }

  res.json({
    connected: true,
    chargesEnabled,
    payoutsEnabled,
    requirementsDue: account.requirements?.currently_due ?? [],
  });
};
