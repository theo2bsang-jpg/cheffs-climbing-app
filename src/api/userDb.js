/** Force-set password (admin flows) by username while preserving user identity. */
export async function setPasswordByUsername(username, newPassword) {
  await ensureUsersDbSeeded();
  const db = readDb();
  if (!db?.users) throw new Error("DB not initialized");

  const normalizedUsername = String(username).trim();
  const index = db.users.findIndex((u) => u.username === normalizedUsername);
  if (index === -1) throw new Error("User not found");

  const user = db.users[index];
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const saltBase64 = bytesToBase64(saltBytes);
  const passwordHash = await hashPassword({ password: newPassword, saltBase64 });

  const updated = {
    ...user,
    password_salt: saltBase64,
    password_hash: passwordHash,
    updated_at: Date.now(),
  };

  db.users = [...db.users.slice(0, index), updated, ...db.users.slice(index + 1)];
  writeDb(db);
  return sanitizeUser(updated);
}
/** Verify current password before rotating salt/hash, by username. */
export async function changePasswordByUsername(username, currentPassword, newPassword) {
  await ensureUsersDbSeeded();
  const db = readDb();
  if (!db?.users) throw new Error("DB not initialized");

  const normalizedUsername = String(username).trim();
  const index = db.users.findIndex((u) => u.username === normalizedUsername);
  if (index === -1) throw new Error("User not found");

  const user = db.users[index];
  const ok = await verifyUserPassword({ email: user.email, password: currentPassword });
  if (!ok) throw new Error("Current password invalid");

  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const saltBase64 = bytesToBase64(saltBytes);
  const passwordHash = await hashPassword({ password: newPassword, saltBase64 });

  const updated = {
    ...user,
    password_salt: saltBase64,
    password_hash: passwordHash,
    updated_at: Date.now(),
  };

  db.users = [...db.users.slice(0, index), updated, ...db.users.slice(index + 1)];
  writeDb(db);
  return sanitizeUser(updated);
}
/** Remove user record by username and return sanitized copy. */
export async function deleteUserByUsername(username) {
  await ensureUsersDbSeeded();
  const db = readDb();
  if (!db?.users) throw new Error("DB not initialized");

  const normalizedUsername = String(username).trim();
  const index = db.users.findIndex((u) => u.username === normalizedUsername);
  if (index === -1) throw new Error("User not found");

  const removed = db.users[index];
  db.users = [...db.users.slice(0, index), ...db.users.slice(index + 1)];
  writeDb(db);
  return sanitizeUser(removed);
}
/** Case-sensitive lookup by username. */
export async function findUserByUsername(username) {
  await ensureUsersDbSeeded();
  const db = readDb();
  const user = (db?.users ?? []).find(
    (u) => u.username === String(username)
  );
  return user ?? null;
}
/** Merge patch onto user by username; non-admins cannot escalate privileges. */
export async function updateUserByUsername(username, patch) {
  await ensureUsersDbSeeded();
  const db = readDb();
  if (!db?.users) throw new Error("DB not initialized");

  const normalizedUsername = String(username).trim();
  const index = db.users.findIndex((u) => u.username === normalizedUsername);
  if (index === -1) throw new Error("User not found");

  // Prevent non-admins from changing the `is_global_admin` flag.
  const currentRaw = localStorage.getItem('currentUser');
  const currentUser = currentRaw ? JSON.parse(currentRaw) : null;
  const safePatch = { ...patch };
  if ('is_global_admin' in safePatch && !currentUser?.is_global_admin) {
    delete safePatch.is_global_admin;
  }

  const updated = {
    ...db.users[index],
    ...safePatch,
    username: db.users[index].username, // username is the identifier; keep stable
    updated_at: Date.now(),
  };

  db.users = [...db.users.slice(0, index), updated, ...db.users.slice(index + 1)];
  writeDb(db);
  return sanitizeUser(updated);
}
/** Offline user auth store with salted SHA-256 hashes in localStorage; used as fallback. */
const STORAGE_KEY = "cheffs.users.db.v1";

const encoder = new TextEncoder();

/** Encode a byte array as base64. */
function bytesToBase64(bytes) {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

/** Decode base64 into a byte array. */
function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Strip password metadata before returning user objects to callers. */
function sanitizeUser(user) {
  if (!user) return user;
  // Avoid leaking password metadata into `currentUser` localStorage.
  // eslint-disable-next-line no-unused-vars
  const { password_salt, password_hash, ...safeUser } = user;
  return safeUser;
}

/** Read serialized user DB from localStorage. */
function readDb() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Persist users snapshot to localStorage. */
function writeDb(db) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

/** Browser-native SHA-256 for password hashing. */
async function sha256(bytes) {
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return new Uint8Array(hash);
}

/** Derive hash = SHA-256(salt || password) encoded as base64. */
async function hashPassword({ password, saltBase64 }) {
  const salt = base64ToBytes(saltBase64);
  const passwordBytes = encoder.encode(password);
  const combined = new Uint8Array(salt.length + passwordBytes.length);
  combined.set(salt, 0);
  combined.set(passwordBytes, salt.length);
  const hashBytes = await sha256(combined);
  return bytesToBase64(hashBytes);
}

/** Compute next id for the offline user list. */
function nextId(users) {
  const max = users.reduce((acc, u) => Math.max(acc, u.id ?? 0), 0);
  return max + 1;
}

/** Initialize empty offline user store; no default accounts for security. */
export async function ensureUsersDbSeeded() {
  const existing = readDb();
  if (existing?.version === 1 && Array.isArray(existing.users)) return;
  // Initialize an empty users DB. Do not seed any default accounts or passwords.
  writeDb({ version: 1, users: [] });
}

/** Return all users without secret fields. */
export async function listUsers() {
  await ensureUsersDbSeeded();
  const db = readDb();
  return (db?.users ?? []).map(sanitizeUser);
}

/** Case-insensitive lookup by email. */
export async function findUserByEmail(email) {
  await ensureUsersDbSeeded();
  const db = readDb();
  const user = (db?.users ?? []).find(
    (u) => u.email?.toLowerCase() === String(email).toLowerCase()
  );
  return user ?? null;
}

/** Validate password by recomputing salted hash. */
export async function verifyUserPassword({ email, password }) {
  const user = await findUserByEmail(email);
  if (!user) return false;
  const computed = await hashPassword({ password, saltBase64: user.password_salt });
  return computed === user.password_hash;
}

/** Create user offline; only admins can set is_global_admin flag. */
export async function createUser({
  username,
  password,
  full_name,
  spray_wall_par_defaut = null,
  role = "user",
  is_global_admin = false,
}) {
  await ensureUsersDbSeeded();
  const db = readDb() ?? { version: 1, users: [] };

  const normalizedUsername = String(username).trim();
  if (!normalizedUsername) throw new Error("Username required");
  if ((db.users ?? []).some((u) => u.username === normalizedUsername)) {
    throw new Error("Username already exists");
  }

  // Only allow creating an admin user if the currently-logged-in user is an admin.
  // This prevents arbitrary self-registration from creating admin accounts.
  const currentRaw = localStorage.getItem('currentUser');
  const currentUser = currentRaw ? JSON.parse(currentRaw) : null;
  const effectiveIsGlobalAdmin = currentUser?.is_global_admin ? !!is_global_admin : false;

  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const saltBase64 = bytesToBase64(saltBytes);
  const passwordHash = await hashPassword({ password, saltBase64 });
  const now = Date.now();

  const user = {
    id: nextId(db.users ?? []),
    username: normalizedUsername,
    full_name: full_name ?? normalizedUsername,
    spray_wall_par_defaut,
    role,
    is_global_admin: effectiveIsGlobalAdmin,
    password_salt: saltBase64,
    password_hash: passwordHash,
    created_at: now,
    updated_at: now,
  };

  db.users = [...(db.users ?? []), user];
  writeDb(db);
  return sanitizeUser(user);
}

/** Merge patch onto user; non-admins cannot escalate privileges. */
export async function updateUserByEmail(email, patch) {
  await ensureUsersDbSeeded();
  const db = readDb();
  if (!db?.users) throw new Error("DB not initialized");

  const normalizedEmail = String(email).trim().toLowerCase();
  const index = db.users.findIndex((u) => u.email?.toLowerCase() === normalizedEmail);
  if (index === -1) throw new Error("User not found");

  // Prevent non-admins from changing the `is_global_admin` flag.
  const currentRaw = localStorage.getItem('currentUser');
  const currentUser = currentRaw ? JSON.parse(currentRaw) : null;
  const safePatch = { ...patch };
  if ('is_global_admin' in safePatch && !currentUser?.is_global_admin) {
    delete safePatch.is_global_admin;
  }

  const updated = {
    ...db.users[index],
    ...safePatch,
    email: db.users[index].email, // email is the identifier; keep stable
    updated_at: Date.now(),
  };

  db.users = [...db.users.slice(0, index), updated, ...db.users.slice(index + 1)];
  writeDb(db);
  return sanitizeUser(updated);
}

/** Remove user record and return sanitized copy. */
export async function deleteUserByEmail(email) {
  await ensureUsersDbSeeded();
  const db = readDb();
  if (!db?.users) throw new Error("DB not initialized");

  const normalizedEmail = String(email).trim().toLowerCase();
  const index = db.users.findIndex((u) => u.email?.toLowerCase() === normalizedEmail);
  if (index === -1) throw new Error("User not found");

  const removed = db.users[index];
  db.users = [...db.users.slice(0, index), ...db.users.slice(index + 1)];
  writeDb(db);
  return sanitizeUser(removed);
}

/** Verify current password before rotating salt/hash. */
export async function changePasswordByEmail(email, currentPassword, newPassword) {
  await ensureUsersDbSeeded();
  const db = readDb();
  if (!db?.users) throw new Error("DB not initialized");

  const normalizedEmail = String(email).trim().toLowerCase();
  const index = db.users.findIndex((u) => u.email?.toLowerCase() === normalizedEmail);
  if (index === -1) throw new Error("User not found");

  const user = db.users[index];
  const ok = await verifyUserPassword({ email: user.email, password: currentPassword });
  if (!ok) throw new Error("Current password invalid");

  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const saltBase64 = bytesToBase64(saltBytes);
  const passwordHash = await hashPassword({ password: newPassword, saltBase64 });

  const updated = {
    ...user,
    password_salt: saltBase64,
    password_hash: passwordHash,
    updated_at: Date.now(),
  };

  db.users = [...db.users.slice(0, index), updated, ...db.users.slice(index + 1)];
  writeDb(db);
  return sanitizeUser(updated);
}

/** Force-set password (admin flows) while preserving user identity. */
export async function setPasswordByEmail(email, newPassword) {
  await ensureUsersDbSeeded();
  const db = readDb();
  if (!db?.users) throw new Error("DB not initialized");

  const normalizedEmail = String(email).trim().toLowerCase();
  const index = db.users.findIndex((u) => u.email?.toLowerCase() === normalizedEmail);
  if (index === -1) throw new Error("User not found");

  const user = db.users[index];
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const saltBase64 = bytesToBase64(saltBytes);
  const passwordHash = await hashPassword({ password: newPassword, saltBase64 });

  const updated = {
    ...user,
    password_salt: saltBase64,
    password_hash: passwordHash,
    updated_at: Date.now(),
  };

  db.users = [...db.users.slice(0, index), updated, ...db.users.slice(index + 1)];
  writeDb(db);
  return sanitizeUser(updated);
}

