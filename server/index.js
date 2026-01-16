/** Express API for auth plus climbing entities with CSRF and rate limits. */
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { signToken, verifyToken, authMiddleware, requireAdmin } from './auth.js';
import { getUserByUsername, createUser, updateUserByUsername, deleteUserByUsername, listUsers,
  listBoulders, createBoulder, updateBoulder, deleteBoulder,
  listContiBoucles, createContiBoucle, updateContiBoucle, deleteContiBoucle,
  listAscensions, createAscension, updateAscension, deleteAscension,
  listTests, createTest, updateTest, deleteTest,
  listBlocMax, createBlocMax, updateBlocMax, deleteBlocMax,
  listVoieMax, createVoieMax, updateVoieMax, deleteVoieMax,
  listBelleOuvertures, createBelleOuverture, updateBelleOuverture, deleteBelleOuverture
  , listSprayWalls, createSprayWall, updateSprayWall, deleteSprayWall
  , listHolds, createHold, updateHold, deleteHold
  , createRefreshToken, deleteRefreshTokensByUserId, getUserByRefreshTokenHash, deleteRefreshTokenById, listRefreshTokensForUser, getRefreshTokenById
} from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const COOKIE_NAME = process.env.COOKIE_NAME || 'cheffs_token';
const REFRESH_COOKIE_NAME = process.env.REFRESH_COOKIE_NAME || 'cheffs_refresh';

// Security middleware
app.use(helmet());
app.set('trust proxy', 1); // Trust proxy headers from Render

// CORS: restrict to allowed origins provided in ALLOWED_ORIGINS env (comma-separated)
// Always include this server's own origin to avoid blocking same-origin asset/API requests.
const defaultAllowed = ['http://localhost:5173'];
const serverOrigin = `http://localhost:${PORT}`;
// Parse ALLOWED_ORIGINS env variable strictly - no auto-allow
const envOrigins = (process.env.ALLOWED_ORIGINS || defaultAllowed.join(',')).split(',').map(s => s.trim()).filter(Boolean);
const allowedOrigins = Array.from(new Set(envOrigins.concat([serverOrigin])));
app.use(express.json());
app.use(cookieParser());
// Apply CORS only to API routes to avoid breaking static asset serving
app.use('/api', cors({
  origin: (origin, callback) => {
    // allow non-browser requests (curl, server-to-server)
    if (!origin) return callback(null, true);
    // Check if origin matches allowed list - strict matching only
    if (allowedOrigins.includes(origin)) return callback(null, true);
    console.warn(`CORS rejected origin: ${origin}. Allowed origins: ${allowedOrigins.join(', ')}`);
    return callback(new Error('CORS policy: origin not allowed'));
  },
  credentials: true,
}));

// Global rate limiter for API (more permissive than authLimiter)
const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 200, message: { error: 'Too many requests, slow down' } });
app.use('/api/', apiLimiter);

/** Simple same-origin/referrer check for state-changing requests to mitigate CSRF. */
function enforceSameOriginForUnsafeMethods(req, res, next) {
  const unsafe = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (!unsafe.includes(req.method)) return next();
  const origin = req.get('Origin') || req.get('Referer') || null;
  // allow non-browser clients (no Origin/Referer)
  if (!origin) return next();
  try {
    const url = new URL(origin);
    const originOnly = url.origin;
    if (allowedOrigins.includes(originOnly)) return next();
  } catch (e) {
    // If Origin/Referer is malformed, reject
  }
  return res.status(403).json({ error: 'Cross-origin requests are not allowed' });
}
app.use(enforceSameOriginForUnsafeMethods);
 
// health endpoint
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// debug: verify a token (dev-only)
app.get('/api/debug/verify', (req, res) => {
  const token = req.query.token || req.header('Authorization')?.replace(/^Bearer\s+/, '');
  if (!token) return res.status(400).json({ error: 'token required as ?token= or Authorization header' });
  const payload = verifyToken(token);
  if (!payload) return res.status(400).json({ error: 'Invalid token' });
  res.json({ payload });
});
// Rate limiting for auth endpoints
const authLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, message: { error: 'Too many requests, try later' } });

// helpers
/** Strip sensitive password fields before returning user objects. */
function sanitizeUser(user) {
  if (!user) return null;
  const { password_hash, password_salt, ...safe } = user;
  return safe;
}

// auth routes
app.post('/api/auth/register', async (req, res) => {
  const { username, password, full_name } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  const normalized = String(username).trim().toLowerCase();
  if (getUserByUsername(normalized)) return res.status(400).json({ error: 'Username already exists' });
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);
  const user = createUser({ username: normalized, full_name: full_name || normalized, password_hash: hash, is_global_admin: 0 });
  // issue short-lived access token and a rotating refresh token stored as HttpOnly cookies
  const accessToken = signToken({ id: user.id, username: user.username, is_global_admin: user.is_global_admin }, '15m');
  const refreshRaw = crypto.randomBytes(64).toString('hex');
  const refreshHash = bcrypt.hashSync(refreshRaw, bcrypt.genSaltSync(10));
  const refreshExpiry = Date.now() + (1000 * 60 * 60 * 24 * 14); // 14 days
  createRefreshToken(user.id, refreshHash, refreshExpiry, {
    device_info: req.body?.device_info || null,
    ip_address: req.ip || req.headers['x-forwarded-for'] || null,
    user_agent: req.get('User-Agent') || null,
  });
  const cookieOptions = { httpOnly: true, sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'lax', secure: process.env.NODE_ENV === 'production' };
  res.cookie(COOKIE_NAME, accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
  res.cookie(REFRESH_COOKIE_NAME, refreshRaw, { ...cookieOptions, maxAge: refreshExpiry - Date.now() });
  // debug log token info (dev only)
  try {
    if (process.env.NODE_ENV !== 'production') {
      const masked = accessToken ? `${accessToken.substring(0,8)}..${accessToken.substring(accessToken.length-8)}` : '<empty>';
      console.log(`login: issued token length=${accessToken?.length ?? 0} preview=${masked}`);
    }
  } catch (e) { /* ignore logging errors */ }
  // also return token in body to support non-browser API clients
  res.json({ user: sanitizeUser(user) });
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  const user = getUserByUsername(String(username).trim().toLowerCase());
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  let ok = false;
  try {
    ok = await bcrypt.compare(password, user.password_hash);
  } catch (e) {
    ok = false;
  }

  // If bcrypt fails (or doesn't match) but a legacy `password_salt` is present, verify SHA-256(salt+password)
  if (!ok && user.password_salt) {
    try {
      const saltBuf = Buffer.from(user.password_salt, 'base64');
      const pwBuf = Buffer.from(String(password), 'utf8');
      const combined = Buffer.concat([saltBuf, pwBuf]);
      const legacyHash = crypto.createHash('sha256').update(combined).digest('base64');
      if (legacyHash === user.password_hash) {
        // migrate to bcrypt
        const newHash = bcrypt.hashSync(password, bcrypt.genSaltSync(10));
        updateUserByUsername(user.username, { password_hash: newHash, password_salt: null });
        ok = true;
      }
    } catch (e) {
      // ignore migration errors
    }
  }

  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  // issue short-lived access token and a rotating refresh token stored as HttpOnly cookies
  const accessToken = signToken({ id: user.id, username: user.username, is_global_admin: user.is_global_admin }, '15m');
  const refreshRaw = crypto.randomBytes(64).toString('hex');
  const refreshHash = bcrypt.hashSync(refreshRaw, bcrypt.genSaltSync(10));
  const refreshExpiry = Date.now() + (1000 * 60 * 60 * 24 * 14); // 14 days
  // create a refresh token row for this device/session
  createRefreshToken(user.id, refreshHash, refreshExpiry, {
    device_info: req.body?.device_info || null,
    ip_address: req.ip || req.headers['x-forwarded-for'] || null,
    user_agent: req.get('User-Agent') || null,
  });
  const cookieOptions = { httpOnly: true, sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'lax', secure: process.env.NODE_ENV === 'production' };
  res.cookie(COOKIE_NAME, accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
  res.cookie(REFRESH_COOKIE_NAME, refreshRaw, { ...cookieOptions, maxAge: refreshExpiry - Date.now() });
  try {
    if (process.env.NODE_ENV !== 'production') {
      const masked = accessToken ? `${accessToken.substring(0,8)}..${accessToken.substring(accessToken.length-8)}` : '<empty>';
      console.log(`login: issued token length=${accessToken?.length ?? 0} preview=${masked}`);
    }
  } catch (e) {}
  // return user object only; browser will use cookies for auth
  res.json({ user: sanitizeUser(user) });
});

app.post('/api/auth/logout', (req, res) => {
  // delete only the refresh token associated with this session (if present)
  const refreshRaw = req.cookies?.[REFRESH_COOKIE_NAME] || req.header('x-refresh-token') || null;
  if (refreshRaw) {
    const found = getUserByRefreshTokenHash(refreshRaw);
    if (found && found.token) {
      try { deleteRefreshTokenById(found.token.id); } catch (e) { /* ignore */ }
    }
  }
  res.clearCookie(COOKIE_NAME);
  res.clearCookie(REFRESH_COOKIE_NAME);
  res.json({ ok: true });
});

// Refresh endpoint: rotate refresh token and issue new access token
app.post('/api/auth/refresh', (req, res) => {
  const refreshRaw = req.cookies?.[REFRESH_COOKIE_NAME] || req.header('x-refresh-token') || null;
  if (!refreshRaw) return res.status(401).json({ error: 'Refresh token required' });
  const found = getUserByRefreshTokenHash(refreshRaw);
  if (!found) return res.status(401).json({ error: 'Invalid refresh token' });
  const { token: tokenRow, user } = found;
  if (tokenRow.expires_at < Date.now()) {
    // expired
    deleteRefreshTokenById(tokenRow.id);
    return res.status(401).json({ error: 'Refresh token expired' });
  }
  // rotate: delete old token, create a new one
  deleteRefreshTokenById(tokenRow.id);
  const newRefreshRaw = crypto.randomBytes(64).toString('hex');
  const newRefreshHash = bcrypt.hashSync(newRefreshRaw, bcrypt.genSaltSync(10));
  const newExpiry = Date.now() + (1000 * 60 * 60 * 24 * 14);
  createRefreshToken(user.id, newRefreshHash, newExpiry);
  const newAccessToken = signToken({ id: user.id, email: user.email, is_global_admin: user.is_global_admin }, '15m');
  const cookieOptions = { httpOnly: true, sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'lax', secure: process.env.NODE_ENV === 'production' };
  res.cookie(COOKIE_NAME, newAccessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
  res.cookie(REFRESH_COOKIE_NAME, newRefreshRaw, { ...cookieOptions, maxAge: newExpiry - Date.now() });
  res.json({ user: sanitizeUser(user) });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const user = getUserByUsername(req.user.username);
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json({ user: sanitizeUser(user) });
});

// List active sessions for current user
app.get('/api/auth/sessions', authMiddleware, (req, res) => {
  try {
    const sessions = listRefreshTokensForUser(req.user.id || req.user.id);
    res.json({ sessions });
  } catch (e) {
    res.status(500).json({ error: 'Failed to list sessions' });
  }
});

// Revoke a session by id (current user or admin)
app.delete('/api/auth/sessions/:id', authMiddleware, (req, res) => {
  const id = Number(req.params.id);
  const tokenRow = getRefreshTokenById(id);
  if (!tokenRow) return res.status(404).json({ error: 'Session not found' });
  if (tokenRow.user_id !== req.user.id && !req.user.is_global_admin) return res.status(403).json({ error: 'Forbidden' });
  deleteRefreshTokenById(id);
  res.json({ success: true });
});

// Recovery endpoint: Reset admin password with recovery token
// Usage: POST /api/auth/recovery with { recovery_token, new_password }
app.post('/api/auth/recovery', (req, res) => {
  const { recovery_token, new_password, admin_username } = req.body;
  // Require admin_username explicitly
  if (!admin_username || typeof admin_username !== 'string' || !admin_username.trim()) {
    return res.status(400).json({ error: 'admin_username is required' });
  }
  // Require recovery token from environment
  if (!process.env.RECOVERY_TOKEN) {
    return res.status(503).json({ error: 'Recovery disabled: RECOVERY_TOKEN not configured' });
  }
  // Validate recovery token
  if (!recovery_token || recovery_token !== process.env.RECOVERY_TOKEN) {
    return res.status(401).json({ error: 'Invalid recovery token' });
  }
  // Validate new password
  if (!new_password || new_password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }
  // Get or create admin user
  const username = admin_username.toLowerCase();
  let user = getUserByUsername(username);
  // Hash new password
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(new_password, salt);
  const now = Date.now();
  if (!user) {
    // Create new admin
    user = createUser({
      username,
      full_name: 'Admin',
      password_hash: hash,
      password_salt: salt,
      is_global_admin: 1
    });
    console.log(`Recovery: Created new admin user: ${username}`);
  } else {
    // Update existing admin
    user = updateUserByUsername(username, {
      password_hash: hash,
      password_salt: salt,
      is_global_admin: 1
    });
    console.log(`Recovery: Reset admin password for: ${username}`);
  }
  res.json({ success: true, message: `Admin password reset for ${username}` });
});

// Revoke a session by id (current user or admin)
app.delete('/api/auth/sessions/:id', authMiddleware, (req, res) => {
  const id = Number(req.params.id);
  const tokenRow = getRefreshTokenById(id);
  if (!tokenRow) return res.status(404).json({ error: 'Session not found' });
  // Only owner or admin can delete
  if (tokenRow.user_id !== req.user.id && !req.user.is_global_admin) return res.status(403).json({ error: 'Forbidden' });
  try {
    deleteRefreshTokenById(id);
    // If the deleted session matches the current refresh cookie, clear cookies
    const currentRefresh = req.cookies?.[REFRESH_COOKIE_NAME];
    if (currentRefresh) {
      const found = getUserByRefreshTokenHash(currentRefresh);
      if (!found || found.token.id === id) {
        res.clearCookie(COOKIE_NAME);
        res.clearCookie(REFRESH_COOKIE_NAME);
      }
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

// admin user management
app.get('/api/users', authMiddleware, requireAdmin, (req, res) => {
  const users = listUsers();
  res.json({ users: users.map(sanitizeUser) });
});

app.post('/api/users', authMiddleware, requireAdmin, (req, res) => {
  const { username, full_name, password, is_global_admin } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  // createUser expects password_hash; hash it here
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(password, salt);
  try {
    const user = createUser({ username: String(username).trim().toLowerCase(), full_name: full_name || username, password_hash: hash, is_global_admin: is_global_admin ? 1 : 0 });
    console.log(`[CREATE] User created: ${user.username} (admin: ${user.is_global_admin}) by ${req.user.username}`);
    res.json({ user: sanitizeUser(user) });
  } catch (e) {
    // Handle both SQLITE_CONSTRAINT and SQLITE_CONSTRAINT_UNIQUE for duplicate usernames
    if (
      (e && (e.code === 'SQLITE_CONSTRAINT' || e.code === 'SQLITE_CONSTRAINT_UNIQUE')) &&
      String(e.message).toLowerCase().includes('unique constraint failed: users.username')
    ) {
      return res.status(409).json({ error: 'Username already exists' });
    }
    console.error('Failed to create user:', e);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

app.patch('/api/users/:username', authMiddleware, (req, res) => {
  const username = String(req.params.username).trim().toLowerCase();
  const patch = req.body || {};
  const existing = getUserByUsername(username);
  if (!existing) return res.status(404).json({ error: 'User not found' });
  // Allow users to update their own profile, or admins to update any profile
  if (req.user.username !== username && !req.user.is_global_admin) return res.status(403).json({ error: 'Forbidden' });
  const updated = updateUserByUsername(username, patch);
  console.log(`[UPDATE] User updated: ${username} by ${req.user.username}`);
  res.json({ user: sanitizeUser(updated) });
});

app.delete('/api/users/:username', authMiddleware, requireAdmin, (req, res) => {
  const username = String(req.params.username).trim().toLowerCase();
  const removed = deleteUserByUsername(username);
  if (!removed) return res.status(404).json({ error: 'User not found' });
  console.log(`[DELETE] User deleted: ${username} by ${req.user.username}`);
  res.json({ user: sanitizeUser(removed) });
});

// --- Entities routes ---
// Boulders
app.get('/api/boulders', (req, res) => res.json({ boulders: listBoulders() }));
app.post('/api/boulders', authMiddleware, (req, res) => {
  const boulder = createBoulder(req.body);
  console.log(`[CREATE] Boulder created: ID ${boulder.id}, "${boulder.nom}", niveau ${boulder.niveau} by ${req.user.username}`);
  res.json({ boulder });
});
app.patch('/api/boulders/:id', authMiddleware, (req, res) => {
  const id = Number(req.params.id);
  const updated = updateBoulder(id, req.body || {});
  if (!updated) return res.status(404).json({ error: 'Not found' });
  console.log(`[UPDATE] Boulder updated: ID ${id}, "${updated.nom}" by ${req.user.username}`);
  res.json({ boulder: updated });
});
app.delete('/api/boulders/:id', authMiddleware, (req, res) => {
  const id = Number(req.params.id);
  const removed = deleteBoulder(id);
  if (!removed) return res.status(404).json({ error: 'Not found' });
  console.log(`[DELETE] Boulder deleted: ID ${id} by ${req.user.username}`);
  res.json(removed);
});

// ContiBoucles
app.get('/api/contiBoucles', (req, res) => res.json({ contiBoucles: listContiBoucles() }));
app.post('/api/contiBoucles', authMiddleware, (req, res) => {
  const contiBoucle = createContiBoucle(req.body);
  console.log(`[CREATE] Conti boucle created: ID ${contiBoucle.id}, "${contiBoucle.nom}" by ${req.user.username}`);
  res.json({ contiBoucle });
});
app.patch('/api/contiBoucles/:id', authMiddleware, (req, res) => {
  const id = Number(req.params.id);
  const updated = updateContiBoucle(id, req.body || {});
  if (!updated) return res.status(404).json({ error: 'Not found' });
  console.log(`[UPDATE] Conti boucle updated: ID ${id}, "${updated.nom}" by ${req.user.username}`);
  res.json({ contiBoucle: updated });
});
app.delete('/api/contiBoucles/:id', authMiddleware, (req, res) => {
  const id = Number(req.params.id);
  const existing = listContiBoucles().find(b => b.id === id);
  const removed = deleteContiBoucle(id);
  if (!removed) return res.status(404).json({ error: 'Not found' });
  if (existing) console.log(`[DELETE] Conti boucle deleted: ID ${id}, "${existing.nom}" by ${req.user.username}`);
  res.json(removed);
});

// Ascensions
app.get('/api/ascensions', (req, res) => res.json({ ascensions: listAscensions() }));
app.post('/api/ascensions', authMiddleware, (req, res) => res.json({ ascension: createAscension(req.body) }));
app.patch('/api/ascensions/:id', authMiddleware, (req, res) => {
  const id = Number(req.params.id);
  const updated = updateAscension(id, req.body || {});
  if (!updated) return res.status(404).json({ error: 'Not found' });
  res.json({ ascension: updated });
});
app.delete('/api/ascensions/:id', authMiddleware, (req, res) => {
  const id = Number(req.params.id);
  const removed = deleteAscension(id);
  if (!removed) return res.status(404).json({ error: 'Not found' });
  res.json(removed);
});

// Tests
app.get('/api/tests', (req, res) => res.json({ tests: listTests() }));
app.post('/api/tests', authMiddleware, (req, res) => res.json({ test: createTest(req.body) }));
app.patch('/api/tests/:id', authMiddleware, (req, res) => {
  const id = Number(req.params.id);
  const updated = updateTest(id, req.body || {});
  if (!updated) return res.status(404).json({ error: 'Not found' });
  res.json({ test: updated });
});
app.delete('/api/tests/:id', authMiddleware, (req, res) => {
  const id = Number(req.params.id);
  const removed = deleteTest(id);
  if (!removed) return res.status(404).json({ error: 'Not found' });
  res.json(removed);
});

// BlocMax
app.get('/api/blocMax', (req, res) => res.json({ blocMax: listBlocMax() }));
app.post('/api/blocMax', authMiddleware, (req, res) => res.json({ bloc: createBlocMax(req.body) }));
app.patch('/api/blocMax/:id', authMiddleware, (req, res) => {
  const id = Number(req.params.id);
  const updated = updateBlocMax(id, req.body || {});
  if (!updated) return res.status(404).json({ error: 'Not found' });
  res.json({ bloc: updated });
});
app.delete('/api/blocMax/:id', authMiddleware, (req, res) => {
  const id = Number(req.params.id);
  const removed = deleteBlocMax(id);
  if (!removed) return res.status(404).json({ error: 'Not found' });
  res.json(removed);
});

// VoieMax
app.get('/api/voieMax', (req, res) => res.json({ voieMax: listVoieMax() }));
app.post('/api/voieMax', authMiddleware, (req, res) => res.json({ voie: createVoieMax(req.body) }));
app.patch('/api/voieMax/:id', authMiddleware, (req, res) => {
  const id = Number(req.params.id);
  const updated = updateVoieMax(id, req.body || {});
  if (!updated) return res.status(404).json({ error: 'Not found' });
  res.json({ voie: updated });
});
app.delete('/api/voieMax/:id', authMiddleware, (req, res) => {
  const id = Number(req.params.id);
  const removed = deleteVoieMax(id);
  if (!removed) return res.status(404).json({ error: 'Not found' });
  res.json(removed);
});

// BelleOuvertures
app.get('/api/belleOuvertures', (req, res) => res.json({ belleOuvertures: listBelleOuvertures() }));
app.post('/api/belleOuvertures', authMiddleware, (req, res) => {
  const belle = createBelleOuverture(req.body);
  console.log(`[CREATE] Belle ouverture created: ID ${belle.id}, "${belle.nom}" by ${req.user.username}`);
  res.json({ belle });
});
app.patch('/api/belleOuvertures/:id', authMiddleware, (req, res) => {
  const id = Number(req.params.id);
  const updated = updateBelleOuverture(id, req.body || {});
  if (!updated) return res.status(404).json({ error: 'Not found' });
  console.log(`[UPDATE] Belle ouverture updated: ID ${id}, "${updated.nom}" by ${req.user.username}`);
  res.json({ belle: updated });
});
app.delete('/api/belleOuvertures/:id', authMiddleware, (req, res) => {
  const id = Number(req.params.id);
  const removed = deleteBelleOuverture(id);
  if (!removed) return res.status(404).json({ error: 'Not found' });
  console.log(`[DELETE] Belle ouverture deleted: ID ${id} by ${req.user.username}`);
  res.json(removed);
});

// Lieux: spray walls and holds
app.get('/api/sprayWalls', (req, res) => res.json({ sprayWalls: listSprayWalls() }));
app.post('/api/sprayWalls', authMiddleware, (req, res) => {
  const sprayWall = createSprayWall(req.body);
  console.log(`[CREATE] Spray wall created: ID ${sprayWall.id}, "${sprayWall.nom}" at ${sprayWall.lieu} by ${req.user.username}`);
  res.json({ sprayWall });
});
app.patch('/api/sprayWalls/:id', authMiddleware, (req, res) => {
  const id = Number(req.params.id);
  const updated = updateSprayWall(id, req.body || {});
  if (!updated) return res.status(404).json({ error: 'Not found' });
  console.log(`[UPDATE] Spray wall updated: ID ${id}, "${updated.nom}" by ${req.user.username}`);
  res.json({ sprayWall: updated });
});
app.delete('/api/sprayWalls/:id', authMiddleware, (req, res) => {
  const id = Number(req.params.id);
  const removed = deleteSprayWall(id);
  if (!removed) return res.status(404).json({ error: 'Not found' });
  console.log(`[DELETE] Spray wall deleted: ID ${id} by ${req.user.email}`);
  res.json(removed);
});

app.get('/api/holds', (req, res) => res.json({ holds: listHolds() }));
app.post('/api/holds', authMiddleware, (req, res) => {
  const hold = createHold(req.body);
  console.log(`[CREATE] Hold created: ID ${hold.id}, "${hold.nom}" on spray wall ${hold.spray_wall_id} by ${req.user.email}`);
  res.json({ hold });
});
app.patch('/api/holds/:id', authMiddleware, (req, res) => {
  const id = Number(req.params.id);
  const updated = updateHold(id, req.body || {});
  if (!updated) return res.status(404).json({ error: 'Not found' });
  console.log(`[UPDATE] Hold updated: ID ${id}, "${updated.nom}" by ${req.user.email}`);
  res.json({ hold: updated });
});
app.delete('/api/holds/:id', authMiddleware, (req, res) => {
  const id = Number(req.params.id);
  const removed = deleteHold(id);
  if (!removed) return res.status(404).json({ error: 'Not found' });
  console.log(`[DELETE] Hold deleted: ID ${id} by ${req.user.email}`);
  res.json(removed);
});

// Serve the built frontend while keeping API routes available.
// Prefer dist alongside the repo root (Docker copies /app/dist). Fallback to ./dist.
const rootDist = path.resolve(process.cwd(), '..', 'dist');
const localDist = path.resolve(process.cwd(), 'dist');
const distPath = fs.existsSync(rootDist) ? rootDist : localDist;

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  // SPA fallback for non-API routes: serve index.html
  app.get(/^\/(?!api).*/, (req, res) => {
    const indexFile = path.join(distPath, 'index.html');
    if (fs.existsSync(indexFile)) return res.sendFile(indexFile);
    return res.status(200).send('Frontend not built - API is available under /api');
  });
  console.log('Serving static files from', distPath);
} else {
  console.warn('Build folder not found at', distPath, '- run `npm run build` first');
}

app.listen(PORT, () => {
  console.log(`Auth server listening on http://localhost:${PORT} (env=${process.env.NODE_ENV || 'development'})`);
});
