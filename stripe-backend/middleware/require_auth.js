import { adminAuth } from '../config/clients.js';

export const requireAuth = async (req, res, next) => {
  const [scheme, token] = (req.headers.authorization || '').split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    req.user = await adminAuth.verifyIdToken(token);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  next();
};
