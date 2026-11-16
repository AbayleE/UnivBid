import express from 'express';
import { handleConnectOnboard, handleConnectStatus } from '../controllers/connect_controller.js';
import { handleCreateCheckout } from '../controllers/stripe_controller.js';
import { ipLimiter, userLimiter } from '../middleware/rate_limits.js';
import { requireAuth } from '../middleware/require_auth.js';

const checkoutLimiter = userLimiter(10, 'Too many checkout attempts. Please try again shortly.');
const onboardLimiter = userLimiter(5, 'Too many onboarding attempts. Please try again shortly.');

const router = express.Router();
router.use(ipLimiter);
router.post('/create-checkout-session', requireAuth, checkoutLimiter, handleCreateCheckout);
router.post('/connect/onboard', requireAuth, onboardLimiter, handleConnectOnboard);
router.get('/connect/status', requireAuth, handleConnectStatus);
export default router;
