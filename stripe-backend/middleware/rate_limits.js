import { rateLimit } from 'express-rate-limit';

const common = {
  windowMs: 60 * 1000,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
};

// Runs before token verification, so unauthenticated callers cannot make the
// server verify ID tokens for free.
export const ipLimiter = rateLimit({
  ...common,
  limit: 60,
  message: { error: 'Too many requests. Please try again shortly.' },
});

// Runs after requireAuth, so each signed-in user has their own allowance.
export const userLimiter = (limit, message) => rateLimit({
  ...common,
  limit,
  keyGenerator: (req) => req.user.uid,
  message: { error: message },
});
