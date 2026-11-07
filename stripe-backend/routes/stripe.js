import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { handleCreateCheckout } from '../controllers/stripe_controller.js';
import { requireAuth } from '../middleware/require_auth.js';

const checkoutLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => req.user.uid,
  message: { error: 'Too many checkout attempts. Please try again shortly.' },
});

const router = express.Router();
router.post('/create-checkout-session', requireAuth, checkoutLimiter, handleCreateCheckout);
export default router;
