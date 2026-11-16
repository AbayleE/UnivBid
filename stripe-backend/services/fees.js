import { env } from '../config/env.js';

// The platform keeps a percentage of the price with a floor, but never the
// whole price, so a cheap item can still be sold online.
export const platformFeeCents = (unitAmountCents) => {
  const percentFee = Math.round((unitAmountCents * env.platformFeePercent) / 100);
  const fee = Math.max(percentFee, env.platformFeeMinCents);
  return Math.min(fee, Math.max(unitAmountCents - 1, 0));
};
