/** JWT helpers and Express guards for cookie-based auth. */
import jwt from 'jsonwebtoken';

// Require a strong JWT secret in production
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in production environment');
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';
const COOKIE_NAME = process.env.COOKIE_NAME || 'cheffs_token';

/** Sign a short-lived access token that encodes minimal user identity/roles. */
export function signToken(payload, expiresIn = '15m') {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

/** Verify token integrity and decode claims; return null if invalid/expired. */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

/** Express guard: parse token from cookie/Authorization header and attach req.user. */
export function authMiddleware(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME] || req.header('Authorization')?.replace(/^Bearer\s+/, '');
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Invalid token' });
  req.user = payload;
  next();
}

/** Require elevated flag set by authMiddleware before allowing route execution. */
export function requireAdmin(req, res, next) {
  if (!req.user?.is_global_admin) return res.status(403).json({ error: 'Admin required' });
  next();
}
