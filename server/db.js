/** SQLite persistence layer for users, spray walls, ascents, and tokens. */
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

// Allow overriding DB file location via DATA_DIR env (useful for containers/volumes)
// If not set, place the DB in the current working directory (usually the `server` folder)
const DB_FILE = process.env.DATA_DIR
  ? (process.env.DATA_DIR.startsWith('/') ? process.env.DATA_DIR : path.resolve(process.cwd(), process.env.DATA_DIR))
  : path.resolve(process.cwd(), 'data.db');

// Ensure parent directory exists before opening the DB (prevents better-sqlite3 EINVAL)
try {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log('Created database directory:', dir);
  }
} catch (e) {
  console.error('Failed to create database directory:', e.message);
  throw e;
}
const needInit = !fs.existsSync(DB_FILE);
const db = new Database(DB_FILE);

// Enforce sane defaults for SQLite in production-like environments
try {
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
} catch (e) {
  // ignore pragma failures; DB will still function
}

if (needInit) {
  db.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      full_name TEXT,
      role TEXT DEFAULT 'user',
      is_global_admin INTEGER DEFAULT 0,
      password_hash TEXT NOT NULL,
      password_salt TEXT,
      created_at INTEGER,
      updated_at INTEGER
    );
  `);

  // If the DB was just initialized, create a default admin account.
  // Credentials are taken from env: ADMIN_USERNAME and ADMIN_PASSWORD.
  // In production, require ADMIN_PASSWORD to be set to avoid leaking credentials.
  try {
    const adminUsername = (process.env.ADMIN_USERNAME || 'admin').toLowerCase();
    let adminPassword = process.env.ADMIN_PASSWORD;
    if (process.env.NODE_ENV === 'production' && !adminPassword) {
      throw new Error('ADMIN_PASSWORD must be set in production to create the initial admin user');
    }
    if (!adminPassword) {
      // generate a 12-char random password for development
      adminPassword = Math.random().toString(36).slice(2, 14) + Math.random().toString(36).slice(2, 6);
    }
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(adminPassword, salt);
    const now = Date.now();
    const stmt = db.prepare(`INSERT OR IGNORE INTO users (username, full_name, role, is_global_admin, password_hash, password_salt, created_at, updated_at)
      VALUES (?, ?, 'user', 1, ?, ?, ?, ?)`);
    stmt.run(adminUsername, process.env.ADMIN_NAME || 'Admin', hash, salt, now, now);
    // If we generated the password (development), write it to a file instead of printing it.
    if (!process.env.ADMIN_PASSWORD) {
      try {
        const pwPath = path.resolve(process.cwd(), 'admin-password.txt');
        fs.writeFileSync(pwPath, `username: ${adminUsername}\npassword: ${adminPassword}\n`);
        // attempt to set restrictive permissions on POSIX systems
        try { fs.chmodSync(pwPath, 0o600); } catch (e) { /* ignore */ }
        // eslint-disable-next-line no-console
        console.log(`Default admin created; password written to ${pwPath}`);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('Failed to persist generated admin password to file; check server permissions');
      }
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Failed to create default admin user:', e);
  }
}

// Ensure older DBs get a password_salt column for legacy client hashes
try {
  db.prepare("ALTER TABLE users ADD COLUMN password_salt TEXT").run();
} catch (e) {
  // ignore if column already exists
}

// Ensure we have a column for user's default spray wall selection
try {
  db.prepare("ALTER TABLE users ADD COLUMN spray_wall_par_defaut INTEGER").run();
} catch (e) {
  // ignore if column already exists
}

/**
 * Fetch a user by username (case-insensitive).
 * @param {string} username - The user's username.
 * @returns {object|null} The user row or null if not found.
 */
export function getUserByUsername(username) {
  const row = db.prepare('SELECT * FROM users WHERE lower(username) = lower(?)').get(username);
  return row || null;
}

/**
 * Create a new user with the given data.
 * @param {object} params - User data (username, full_name, password_hash, etc).
 * @returns {object} The created user row.
 */
export function createUser({ username, full_name, password_hash, password_salt = null, is_global_admin = 0, spray_wall_par_defaut = null }) {
  const now = Date.now();
  const stmt = db.prepare(`INSERT INTO users (username, full_name, role, is_global_admin, password_hash, password_salt, spray_wall_par_defaut, created_at, updated_at)
    VALUES (?, ?, 'user', ?, ?, ?, ?, ?, ?)`);
  const info = stmt.run(username, full_name, is_global_admin ? 1 : 0, password_hash, password_salt, spray_wall_par_defaut, now, now);
  return db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
}

/**
 * Update a user by username with a patch object.
 * @param {string} username - The user's username.
 * @param {object} patch - Partial user fields to update.
 * @returns {object|null} The updated user row or null if not found.
 */
export function updateUserByUsername(username, patch) {
  const existing = getUserByUsername(username);
  if (!existing) return null;
  const updated = {
    ...existing,
    ...patch,
    updated_at: Date.now(),
  };
  const stmt = db.prepare(`UPDATE users SET full_name = ?, role = ?, is_global_admin = ?, password_hash = ?, password_salt = ?, spray_wall_par_defaut = ?, updated_at = ? WHERE id = ?`);
  stmt.run(updated.full_name, updated.role, updated.is_global_admin ? 1 : 0, updated.password_hash ?? existing.password_hash, updated.password_salt ?? existing.password_salt, updated.spray_wall_par_defaut ?? existing.spray_wall_par_defaut, updated.updated_at, existing.id);
  return db.prepare('SELECT * FROM users WHERE id = ?').get(existing.id);
}

/**
 * Delete a user by username.
 * @param {string} username - The user's username.
 * @returns {object|null} The deleted user row or null if not found.
 */
export function deleteUserByUsername(username) {
  const existing = getUserByUsername(username);
  if (!existing) return null;
  db.prepare('DELETE FROM users WHERE id = ?').run(existing.id);
  return existing;
}

/**
 * List all users (excluding password fields).
 * @returns {object[]} Array of user rows.
 */
export function listUsers() {
  return db.prepare('SELECT id, username, full_name, role, is_global_admin, spray_wall_par_defaut, created_at, updated_at FROM users ORDER BY id').all();
}

// Refresh token helpers
/**
 * Create a new refresh token for a user.
 * @param {number} userId - The user ID.
 * @param {string} tokenHash - The hashed refresh token.
 * @param {number} expiresAt - Expiry timestamp (ms).
 * @param {object} metadata - Device/session metadata.
 * @returns {object} The created refresh token row.
 */
export function createRefreshToken(userId, tokenHash, expiresAt, metadata = {}) {
  const now = Date.now();
  const stmt = db.prepare('INSERT INTO refresh_tokens (user_id, token_hash, expires_at, created_at, device_info, ip_address, user_agent, last_used_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  const info = stmt.run(userId, tokenHash, expiresAt, now, metadata.device_info || null, metadata.ip_address || null, metadata.user_agent || null, metadata.last_used_at || null);
  return db.prepare('SELECT id, user_id, expires_at, created_at, device_info, ip_address, user_agent, last_used_at FROM refresh_tokens WHERE id = ?').get(info.lastInsertRowid);
}

/**
 * Delete a refresh token by its ID.
 * @param {number} id - The refresh token ID.
 * @returns {object} The result of the delete operation.
 */
export function deleteRefreshTokenById(id) {
  return db.prepare('DELETE FROM refresh_tokens WHERE id = ?').run(id);
}

/**
 * Delete all refresh tokens for a user.
 * @param {number} userId - The user ID.
 * @returns {object} The result of the delete operation.
 */
export function deleteRefreshTokensByUserId(userId) {
  return db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(userId);
}

/**
 * List all refresh tokens in the database.
 * @returns {object[]} Array of refresh token rows.
 */
export function listAllRefreshTokens() {
  return db.prepare('SELECT * FROM refresh_tokens').all();
}

/**
 * Find a user by matching a refresh token (using bcrypt compare).
 * @param {string} candidateToken - The refresh token to check.
 * @returns {{token: object, user: object}|null} The matched token and user, or null.
 */
export function getUserByRefreshTokenHash(candidateToken) {
  const tokens = listAllRefreshTokens();
  for (const t of tokens) {
    try {
      if (bcrypt.compareSync(candidateToken, t.token_hash)) {
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(t.user_id);
        if (!user) continue;
        return { token: t, user };
      }
    } catch (e) {
      // ignore compare errors
    }
  }
  return null;
}

/**
 * List all refresh tokens for a user, newest first.
 * @param {number} userId - The user ID.
 * @returns {object[]} Array of refresh token rows.
 */
export function listRefreshTokensForUser(userId) {
  return db.prepare('SELECT id, user_id, expires_at, created_at, device_info, ip_address, user_agent, last_used_at FROM refresh_tokens WHERE user_id = ? ORDER BY created_at DESC').all(userId);
}

/**
 * Get a refresh token by its ID.
 * @param {number} id - The refresh token ID.
 * @returns {object|null} The refresh token row or null if not found.
 */
export function getRefreshTokenById(id) {
  return db.prepare('SELECT id, user_id, expires_at, created_at, device_info, ip_address, user_agent, last_used_at FROM refresh_tokens WHERE id = ?').get(id);
}

// --- Entities tables and helpers ---
db.exec(`
  CREATE TABLE IF NOT EXISTS boulders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT,
    ouvreur TEXT,
    niveau TEXT,
    spray_wall_id TEXT,
    match_autorise INTEGER DEFAULT 0,
    pied_sur_main_autorise INTEGER DEFAULT 0,
    holds TEXT,
    created_by TEXT,
    created_at INTEGER,
    updated_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS sprayWalls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT,
    lieu TEXT,
    description TEXT,
    photo_url TEXT,
    sous_admin_email TEXT,
    created_at INTEGER,
    updated_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS holds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    spray_wall_id INTEGER,
    nom TEXT,
    x INTEGER,
    y INTEGER,
    created_at INTEGER,
    updated_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS contiBoucles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT,
    ouvreur TEXT,
    description TEXT,
    spray_wall_id TEXT,
    niveau_min TEXT,
    niveau_max TEXT,
    match_autorise INTEGER DEFAULT 0,
    pied_sur_main_autorise INTEGER DEFAULT 0,
    prise_remplacee INTEGER DEFAULT 0,
    holds TEXT,
    created_by TEXT,
    created_at INTEGER,
    updated_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS ascensions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    boulder_id INTEGER,
    boulder_nom TEXT,
    boulder_niveau TEXT,
    type TEXT,
    style TEXT,
    spray_wall_id TEXT,
    user_email TEXT,
    essais INTEGER,
    notes TEXT,
    date INTEGER,
    created_at INTEGER,
    updated_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT,
    type TEXT,
    score REAL,
    valeur REAL,
    max_score REAL,
    date INTEGER,
    notes TEXT,
    created_at INTEGER,
    updated_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS blocMax (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT,
    nom TEXT,
    lieu TEXT,
    niveau TEXT,
    style TEXT,
    essais INTEGER,
    date INTEGER,
    notes TEXT,
    boulder_id INTEGER,
    created_at INTEGER,
    updated_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS voieMax (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT,
    nom TEXT,
    lieu TEXT,
    niveau TEXT,
    style TEXT,
    essais INTEGER,
    date INTEGER,
    notes TEXT,
    voie_id INTEGER,
    created_at INTEGER,
    updated_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS belleOuvertures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT,
    description TEXT,
    photo_url TEXT,
    created_by TEXT,
    niveau TEXT,
    ouvreur TEXT,
    spray_wall_id INTEGER,
    created_at INTEGER,
    updated_at INTEGER
  );
`);

// Migration: add missing columns for belles ouvertures
try { db.prepare('ALTER TABLE belleOuvertures ADD COLUMN niveau TEXT').run(); } catch (e) {}
try { db.prepare('ALTER TABLE belleOuvertures ADD COLUMN ouvreur TEXT').run(); } catch (e) {}
try { db.prepare('ALTER TABLE belleOuvertures ADD COLUMN spray_wall_id INTEGER').run(); } catch (e) {}

// Create refresh_tokens table for rotating refresh tokens (one per login session)
db.exec(`
  CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );
`);

// Index refresh tokens by user for faster lookups and cleanups
try {
  db.exec('CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id)');
} catch (e) {}

// Migration: add device metadata columns for refresh tokens if not present
try { db.prepare('ALTER TABLE refresh_tokens ADD COLUMN device_info TEXT').run(); } catch (e) {}
try { db.prepare('ALTER TABLE refresh_tokens ADD COLUMN ip_address TEXT').run(); } catch (e) {}
try { db.prepare('ALTER TABLE refresh_tokens ADD COLUMN user_agent TEXT').run(); } catch (e) {}
try { db.prepare('ALTER TABLE refresh_tokens ADD COLUMN last_used_at INTEGER').run(); } catch (e) {}

// Generic helpers for JSON columns
/**
 * Serialize an object to a JSON string (or return as-is if already a string).
 * @param {any} obj - The object to serialize.
 * @returns {string|null} The JSON string or null.
 */
function serialize(obj) {
  if (obj == null) return null;
  return typeof obj === 'string' ? obj : JSON.stringify(obj);
}

/**
 * Parse a JSON string, or return the input if parsing fails.
 * @param {string} text - The JSON string.
 * @returns {any} The parsed object or the original string.
 */
function parseJson(text) {
  if (text == null) return null;
  try { return JSON.parse(text); } catch { return text; }
}

// Boulders
/**
 * List all boulders, parsing the holds JSON column.
 * @returns {object[]} Array of boulder rows.
 */
export function listBoulders() {
  const rows = db.prepare('SELECT * FROM boulders ORDER BY id').all();
  return rows.map(r => ({ ...r, holds: parseJson(r.holds) }));
}

/**
 * Create a new boulder entry.
 * @param {object} data - Boulder data (nom, ouvreur, niveau, etc).
 * @returns {object} The created boulder row.
 */
export function createBoulder(data) {
  const now = Date.now();
  const stmt = db.prepare(`INSERT INTO boulders (nom, ouvreur, niveau, spray_wall_id, match_autorise, pied_sur_main_autorise, holds, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const info = stmt.run(
    data.nom || '', data.ouvreur || '', data.niveau || '', data.spray_wall_id || null,
    data.match_autorise ? 1 : 0, data.pied_sur_main_autorise ? 1 : 0, serialize(data.holds), data.created_by || null, now, now
  );
  return db.prepare('SELECT * FROM boulders WHERE id = ?').get(info.lastInsertRowid);
}

/**
 * Update a boulder by ID with a patch object.
 * @param {number} id - The boulder ID.
 * @param {object} patch - Partial boulder fields to update.
 * @returns {object|null} The updated boulder row or null if not found.
 */
export function updateBoulder(id, patch) {
  const existing = db.prepare('SELECT * FROM boulders WHERE id = ?').get(id);
  if (!existing) return null;
  const updated = { ...existing, ...patch, updated_at: Date.now() };
  const stmt = db.prepare(`UPDATE boulders SET nom = ?, ouvreur = ?, niveau = ?, spray_wall_id = ?, match_autorise = ?, pied_sur_main_autorise = ?, holds = ?, created_by = ?, updated_at = ? WHERE id = ?`);
  stmt.run(updated.nom, updated.ouvreur, updated.niveau, updated.spray_wall_id, updated.match_autorise ? 1 : 0, updated.pied_sur_main_autorise ? 1 : 0, serialize(updated.holds), updated.created_by, updated.updated_at, id);
  return db.prepare('SELECT * FROM boulders WHERE id = ?').get(id);
}

/**
 * Delete a boulder by ID.
 * @param {number} id - The boulder ID.
 * @returns {object|null} Success object or null if not found.
 */
export function deleteBoulder(id) {
  const existing = db.prepare('SELECT * FROM boulders WHERE id = ?').get(id);
  if (!existing) return null;
  db.prepare('DELETE FROM boulders WHERE id = ?').run(id);
  return { success: true };
}

// ContiBoucles
/**
 * List all conti boucles.
 * @returns {object[]} Array of conti boucle rows.
 */
export function listContiBoucles() {
  const rows = db.prepare('SELECT * FROM contiBoucles ORDER BY id').all();
  // Add virtual 'niveau' field and deserialize holds for frontend compatibility
  return rows.map(row => ({ ...row, niveau: row.niveau_min, holds: parseJson(row.holds) }));
}

/**
 * Create a new conti boucle entry.
 * @param {object} data - Conti boucle data (nom, description, niveaux, holds, etc).
 * @returns {object} The created conti boucle row.
 */
export function createContiBoucle(data) {
  const now = Date.now();
  // Support both 'niveau' (single level) and 'niveau_min'/'niveau_max' (range)
  const niveauMin = data.niveau_min || data.niveau || '';
  const niveauMax = data.niveau_max || data.niveau || '';
  const stmt = db.prepare(`INSERT INTO contiBoucles (nom, ouvreur, description, spray_wall_id, niveau_min, niveau_max, match_autorise, pied_sur_main_autorise, prise_remplacee, holds, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const info = stmt.run(
    data.nom || '',
    data.ouvreur || '',
    data.description || '',
    data.spray_wall_id || null,
    niveauMin,
    niveauMax,
    data.match_autorise ? 1 : 0,
    data.pied_sur_main_autorise ? 1 : 0,
    data.prise_remplacee ? 1 : 0,
    serialize(data.holds),
    data.created_by || null,
    now,
    now
  );
  const row = db.prepare('SELECT * FROM contiBoucles WHERE id = ?').get(info.lastInsertRowid);
  // Add virtual 'niveau' field and deserialize holds for frontend compatibility
  if (row) {
    row.niveau = row.niveau_min;
    row.holds = parseJson(row.holds);
  }
  return row;
}

/**
 * Update a conti boucle by ID.
 * @param {number} id - The conti boucle ID.
 * @param {object} patch - Partial fields to update.
 * @returns {object|null} The updated row or null if not found.
 */
export function updateContiBoucle(id, patch) {
  const existing = db.prepare('SELECT * FROM contiBoucles WHERE id = ?').get(id);
  if (!existing) return null;
  // Support both 'niveau' and 'niveau_min'/'niveau_max'
  const niveauMin = patch.niveau_min || patch.niveau || existing.niveau_min;
  const niveauMax = patch.niveau_max || patch.niveau || existing.niveau_max;
  const updated = {
    ...existing,
    ...patch,
    niveau_min: niveauMin,
    niveau_max: niveauMax,
    match_autorise: patch.match_autorise !== undefined ? (patch.match_autorise ? 1 : 0) : existing.match_autorise,
    pied_sur_main_autorise: patch.pied_sur_main_autorise !== undefined ? (patch.pied_sur_main_autorise ? 1 : 0) : existing.pied_sur_main_autorise,
    prise_remplacee: patch.prise_remplacee !== undefined ? (patch.prise_remplacee ? 1 : 0) : existing.prise_remplacee,
    updated_at: Date.now()
  };
  const stmt = db.prepare(`UPDATE contiBoucles SET nom = ?, ouvreur = ?, description = ?, spray_wall_id = ?, niveau_min = ?, niveau_max = ?, match_autorise = ?, pied_sur_main_autorise = ?, prise_remplacee = ?, holds = ?, created_by = ?, updated_at = ? WHERE id = ?`);
  stmt.run(
    updated.nom,
    updated.ouvreur,
    updated.description,
    updated.spray_wall_id,
    updated.niveau_min,
    updated.niveau_max,
    updated.match_autorise,
    updated.pied_sur_main_autorise,
    updated.prise_remplacee,
    serialize(updated.holds),
    updated.created_by,
    updated.updated_at,
    id
  );
  const row = db.prepare('SELECT * FROM contiBoucles WHERE id = ?').get(id);
  // Add virtual 'niveau' field and deserialize holds for frontend compatibility
  if (row) {
    row.niveau = row.niveau_min;
    row.holds = parseJson(row.holds);
  }
  return row;
}

/**
 * Delete a conti boucle by ID.
 * @param {number} id - The conti boucle ID.
 * @returns {object|null} Success object or null if not found.
 */
export function deleteContiBoucle(id) {
  const existing = db.prepare('SELECT * FROM contiBoucles WHERE id = ?').get(id);
  if (!existing) return null;
  db.prepare('DELETE FROM contiBoucles WHERE id = ?').run(id);
  return { success: true };
}

// Ascensions
/**
 * List all ascensions.
 * @returns {object[]} Array of ascension rows.
 */
export function listAscensions() {
  return db.prepare('SELECT * FROM ascensions ORDER BY id').all();
}

/**
 * Create a new ascension entry.
 * @param {object} data - Ascension data (boulder, user, style, etc).
 * @returns {object} The created ascension row.
 */
export function createAscension(data) {
  const now = Date.now();
  const stmt = db.prepare(`INSERT INTO ascensions (boulder_id, boulder_nom, boulder_niveau, type, style, spray_wall_id, user_email, essais, notes, date, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const info = stmt.run(data.boulder_id || null, data.boulder_nom || '', data.boulder_niveau || '', data.type || '', data.style || 'flash', data.spray_wall_id || null, data.user_email || '', data.essais || 1, data.notes || '', data.date || now, now, now);
  return db.prepare('SELECT * FROM ascensions WHERE id = ?').get(info.lastInsertRowid);
}

/**
 * Update an ascension by ID.
 * @param {number} id - The ascension ID.
 * @param {object} patch - Partial fields to update.
 * @returns {object|null} The updated row or null if not found.
 */
export function updateAscension(id, patch) {
  const existing = db.prepare('SELECT * FROM ascensions WHERE id = ?').get(id);
  if (!existing) return null;
  const updated = { ...existing, ...patch, updated_at: Date.now() };
  const stmt = db.prepare(`UPDATE ascensions SET boulder_id = ?, boulder_nom = ?, boulder_niveau = ?, type = ?, style = ?, spray_wall_id = ?, user_email = ?, essais = ?, notes = ?, date = ?, updated_at = ? WHERE id = ?`);
  stmt.run(updated.boulder_id, updated.boulder_nom, updated.boulder_niveau, updated.type, updated.style, updated.spray_wall_id, updated.user_email, updated.essais, updated.notes, updated.date, updated.updated_at, id);
  return db.prepare('SELECT * FROM ascensions WHERE id = ?').get(id);
}

/**
 * Delete an ascension by ID.
 * @param {number} id - The ascension ID.
 * @returns {object|null} Success object or null if not found.
 */
export function deleteAscension(id) {
  const existing = db.prepare('SELECT * FROM ascensions WHERE id = ?').get(id);
  if (!existing) return null;
  db.prepare('DELETE FROM ascensions WHERE id = ?').run(id);
  return { success: true };
}

// Tests
/**
 * List all performance tests.
 * @returns {object[]} Array of test rows.
 */
export function listTests() {
  return db.prepare('SELECT * FROM tests ORDER BY id').all();
}

/**
 * Create a new performance test entry.
 * @param {object} data - Test data (type, score, user_email, etc).
 * @returns {object} The created test row.
 */
export function createTest(data) {
  const now = Date.now();
  const stmt = db.prepare(`INSERT INTO tests (user_email, type, score, valeur, max_score, date, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const info = stmt.run(data.user_email || '', data.type || data.type_test || '', data.score || data.valeur || 0, data.valeur || data.score || 0, data.max_score || data.max || 100, data.date || now, data.notes || '', now, now);
  return db.prepare('SELECT * FROM tests WHERE id = ?').get(info.lastInsertRowid);
}

/**
 * Update a performance test by ID.
 * @param {number} id - The test ID.
 * @param {object} patch - Partial fields to update.
 * @returns {object|null} The updated row or null if not found.
 */
export function updateTest(id, patch) {
  const existing = db.prepare('SELECT * FROM tests WHERE id = ?').get(id);
  if (!existing) return null;
  const updated = { ...existing, ...patch, updated_at: Date.now() };
  const stmt = db.prepare(`UPDATE tests SET user_email = ?, type = ?, score = ?, valeur = ?, max_score = ?, date = ?, notes = ?, updated_at = ? WHERE id = ?`);
  stmt.run(updated.user_email, updated.type, updated.score, updated.valeur, updated.max_score, updated.date, updated.notes, updated.updated_at, id);
  return db.prepare('SELECT * FROM tests WHERE id = ?').get(id);
}

/**
 * Delete a performance test by ID.
 * @param {number} id - The test ID.
 * @returns {object|null} Success object or null if not found.
 */
export function deleteTest(id) {
  const existing = db.prepare('SELECT * FROM tests WHERE id = ?').get(id);
  if (!existing) return null;
  db.prepare('DELETE FROM tests WHERE id = ?').run(id);
  return { success: true };
}

// BlocMax
/**
 * List all bloc max entries.
 * @returns {object[]} Array of bloc max rows.
 */
export function listBlocMax() {
  return db.prepare('SELECT * FROM blocMax ORDER BY id').all();
}

/**
 * Create a new bloc max entry.
 * @param {object} data - Bloc max data (user_email, niveau, etc).
 * @returns {object} The created bloc max row.
 */
export function createBlocMax(data) {
  const now = Date.now();
  const stmt = db.prepare(`INSERT INTO blocMax (user_email, nom, lieu, niveau, style, essais, date, notes, boulder_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const info = stmt.run(data.user_email || '', data.nom || '', data.lieu || data.location || '', data.niveau || '', data.style || 'flash', data.essais || null, data.date || now, data.notes || '', data.boulder_id || null, now, now);
  return db.prepare('SELECT * FROM blocMax WHERE id = ?').get(info.lastInsertRowid);
}

/**
 * Update a bloc max entry by ID.
 * @param {number} id - The bloc max ID.
 * @param {object} patch - Partial fields to update.
 * @returns {object|null} The updated row or null if not found.
 */
export function updateBlocMax(id, patch) {
  const existing = db.prepare('SELECT * FROM blocMax WHERE id = ?').get(id);
  if (!existing) return null;
  const updated = { ...existing, ...patch, updated_at: Date.now() };
  const stmt = db.prepare(`UPDATE blocMax SET user_email = ?, nom = ?, lieu = ?, niveau = ?, style = ?, essais = ?, date = ?, notes = ?, boulder_id = ?, updated_at = ? WHERE id = ?`);
  stmt.run(updated.user_email, updated.nom, updated.lieu, updated.niveau, updated.style, updated.essais, updated.date, updated.notes, updated.boulder_id, updated.updated_at, id);
  return db.prepare('SELECT * FROM blocMax WHERE id = ?').get(id);
}

/**
 * Delete a bloc max entry by ID.
 * @param {number} id - The bloc max ID.
 * @returns {object|null} Success object or null if not found.
 */
export function deleteBlocMax(id) {
  const existing = db.prepare('SELECT * FROM blocMax WHERE id = ?').get(id);
  if (!existing) return null;
  db.prepare('DELETE FROM blocMax WHERE id = ?').run(id);
  return { success: true };
}

// VoieMax
/**
 * List all voie max entries.
 * @returns {object[]} Array of voie max rows.
 */
export function listVoieMax() {
  return db.prepare('SELECT * FROM voieMax ORDER BY id').all();
}

/**
 * Create a new voie max entry.
 * @param {object} data - Voie max data (user_email, niveau, etc).
 * @returns {object} The created voie max row.
 */
export function createVoieMax(data) {
  const now = Date.now();
  const stmt = db.prepare(`INSERT INTO voieMax (user_email, nom, lieu, niveau, style, essais, date, notes, voie_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const info = stmt.run(data.user_email || '', data.nom || '', data.lieu || data.location || '', data.niveau || '', data.style || 'flash', data.essais || null, data.date || now, data.notes || '', data.voie_id || null, now, now);
  return db.prepare('SELECT * FROM voieMax WHERE id = ?').get(info.lastInsertRowid);
}

/**
 * Update a voie max entry by ID.
 * @param {number} id - The voie max ID.
 * @param {object} patch - Partial fields to update.
 * @returns {object|null} The updated row or null if not found.
 */
export function updateVoieMax(id, patch) {
  const existing = db.prepare('SELECT * FROM voieMax WHERE id = ?').get(id);
  if (!existing) return null;
  const updated = { ...existing, ...patch, updated_at: Date.now() };
  const stmt = db.prepare(`UPDATE voieMax SET user_email = ?, nom = ?, lieu = ?, niveau = ?, style = ?, essais = ?, date = ?, notes = ?, voie_id = ?, updated_at = ? WHERE id = ?`);
  stmt.run(updated.user_email, updated.nom, updated.lieu, updated.niveau, updated.style, updated.essais, updated.date, updated.notes, updated.voie_id, updated.updated_at, id);
  return db.prepare('SELECT * FROM voieMax WHERE id = ?').get(id);
}

/**
 * Delete a voie max entry by ID.
 * @param {number} id - The voie max ID.
 * @returns {object|null} Success object or null if not found.
 */
export function deleteVoieMax(id) {
  const existing = db.prepare('SELECT * FROM voieMax WHERE id = ?').get(id);
  if (!existing) return null;
  db.prepare('DELETE FROM voieMax WHERE id = ?').run(id);
  return { success: true };
}

// BelleOuvertures
/**
 * List all belles ouvertures.
 * @returns {object[]} Array of belle ouverture rows.
 */
export function listBelleOuvertures() {
  return db.prepare('SELECT * FROM belleOuvertures ORDER BY id').all();
}

/**
 * Create a new belle ouverture entry.
 * @param {object} data - Belle ouverture data (nom, niveau, photo_url, etc).
 * @returns {object} The created belle ouverture row.
 */
export function createBelleOuverture(data) {
  const now = Date.now();
  const stmt = db.prepare(`INSERT INTO belleOuvertures (nom, description, photo_url, created_by, niveau, ouvreur, spray_wall_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const info = stmt.run(
    data.nom || '',
    data.description || '',
    data.photo_url || '',
    data.created_by || null,
    data.niveau || '',
    data.ouvreur || '',
    data.spray_wall_id || null,
    now,
    now
  );
  return db.prepare('SELECT * FROM belleOuvertures WHERE id = ?').get(info.lastInsertRowid);
}

/**
 * Update a belle ouverture by ID.
 * @param {number} id - The belle ouverture ID.
 * @param {object} patch - Partial fields to update.
 * @returns {object|null} The updated row or null if not found.
 */
export function updateBelleOuverture(id, patch) {
  const existing = db.prepare('SELECT * FROM belleOuvertures WHERE id = ?').get(id);
  if (!existing) return null;
  const updated = { ...existing, ...patch, updated_at: Date.now() };
  const stmt = db.prepare(`UPDATE belleOuvertures SET nom = ?, description = ?, photo_url = ?, created_by = ?, niveau = ?, ouvreur = ?, spray_wall_id = ?, updated_at = ? WHERE id = ?`);
  stmt.run(
    updated.nom,
    updated.description,
    updated.photo_url,
    updated.created_by,
    updated.niveau,
    updated.ouvreur,
    updated.spray_wall_id,
    updated.updated_at,
    id
  );
  return db.prepare('SELECT * FROM belleOuvertures WHERE id = ?').get(id);
}

/**
 * Delete a belle ouverture by ID.
 * @param {number} id - The belle ouverture ID.
 * @returns {object|null} Success object or null if not found.
 */
export function deleteBelleOuverture(id) {
  const existing = db.prepare('SELECT * FROM belleOuvertures WHERE id = ?').get(id);
  if (!existing) return null;
  db.prepare('DELETE FROM belleOuvertures WHERE id = ?').run(id);
  return { success: true };
}

// Spray walls and holds
/**
 * List all spray walls.
 * @returns {object[]} Array of spray wall rows.
 */
export function listSprayWalls() {
  return db.prepare('SELECT * FROM sprayWalls ORDER BY id').all();
}

/**
 * Create a new spray wall.
 * @param {object} data - Spray wall data (nom, lieu, photo_url, etc).
 * @returns {object} The created spray wall row.
 */
export function createSprayWall(data) {
  const now = Date.now();
  const stmt = db.prepare(`INSERT INTO sprayWalls (nom, lieu, description, photo_url, sous_admin_email, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`);
  const info = stmt.run(data.nom || '', data.lieu || '', data.description || '', data.photo_url || '', data.sous_admin_email || null, now, now);
  return db.prepare('SELECT * FROM sprayWalls WHERE id = ?').get(info.lastInsertRowid);
}

/**
 * Update a spray wall by ID.
 * @param {number} id - The spray wall ID.
 * @param {object} patch - Partial fields to update.
 * @returns {object|null} The updated row or null if not found.
 */
export function updateSprayWall(id, patch) {
  const existing = db.prepare('SELECT * FROM sprayWalls WHERE id = ?').get(id);
  if (!existing) return null;
  const updated = { ...existing, ...patch, updated_at: Date.now() };
  const stmt = db.prepare(`UPDATE sprayWalls SET nom = ?, lieu = ?, description = ?, photo_url = ?, sous_admin_email = ?, updated_at = ? WHERE id = ?`);
  stmt.run(updated.nom, updated.lieu, updated.description, updated.photo_url, updated.sous_admin_email, updated.updated_at, id);
  return db.prepare('SELECT * FROM sprayWalls WHERE id = ?').get(id);
}

/**
 * Delete a spray wall and its holds.
 * @param {number} id - The spray wall ID.
 * @returns {object|null} Success object or null if not found.
 */
export function deleteSprayWall(id) {
  const existing = db.prepare('SELECT * FROM sprayWalls WHERE id = ?').get(id);
  if (!existing) return null;
  db.prepare('DELETE FROM sprayWalls WHERE id = ?').run(id);
  db.prepare('DELETE FROM holds WHERE spray_wall_id = ?').run(id);
  return { success: true };
}

/**
 * List all holds for all spray walls.
 * @returns {object[]} Array of hold rows.
 */
export function listHolds() {
  const rows = db.prepare('SELECT * FROM holds ORDER BY id').all();
  return rows;
}

/**
 * Create a new hold.
 * @param {object} data - Hold data (spray_wall_id, position, etc).
 * @returns {object} The created hold row.
 */
export function createHold(data) {
  const now = Date.now();
  const stmt = db.prepare(`INSERT INTO holds (spray_wall_id, nom, x, y, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`);
  const info = stmt.run(data.spray_wall_id || null, data.nom || '', data.x || 0, data.y || 0, now, now);
  return db.prepare('SELECT * FROM holds WHERE id = ?').get(info.lastInsertRowid);
}

/**
 * Update a hold by ID.
 * @param {number} id - The hold ID.
 * @param {object} patch - Partial fields to update.
 * @returns {object|null} The updated row or null if not found.
 */
export function updateHold(id, patch) {
  const existing = db.prepare('SELECT * FROM holds WHERE id = ?').get(id);
  if (!existing) return null;
  const updated = { ...existing, ...patch, updated_at: Date.now() };
  const stmt = db.prepare(`UPDATE holds SET spray_wall_id = ?, nom = ?, x = ?, y = ?, updated_at = ? WHERE id = ?`);
  stmt.run(updated.spray_wall_id, updated.nom, updated.x, updated.y, updated.updated_at, id);
  return db.prepare('SELECT * FROM holds WHERE id = ?').get(id);
}

/**
 * Delete a hold by ID.
 * @param {number} id - The hold ID.
 * @returns {object|null} Success object or null if not found.
 */
export function deleteHold(id) {
  const existing = db.prepare('SELECT * FROM holds WHERE id = ?').get(id);
  if (!existing) return null;
  db.prepare('DELETE FROM holds WHERE id = ?').run(id);
  return { success: true };
}
