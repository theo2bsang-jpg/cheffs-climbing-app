/**
 * Server-first API wrappers with offline/localStorage fallbacks.
 * Each entity exposes list/filter/get/create/update/delete helpers that try the HTTP API
 * and gracefully degrade to the local DB utilities when offline.
 */
import {
  createUser,
  ensureUsersDbSeeded,
  findUserByUsername,
  updateUserByUsername,
  verifyUserPassword,
  changePasswordByUsername,
  setPasswordByUsername,
  listUsers,
  deleteUserByUsername,
} from "./userDb";
import {
  createHold,
  createSprayWall,
  deleteHold,
  deleteSprayWall,
  filterHolds,
  filterSprayWalls,
  listHolds,
  listSprayWalls,
  updateHold,
  updateSprayWall,
} from "./lieuxDb";
import {
  createBoulder,
  createContiBoucle,
  createAscension,
  createTest,
  createBlocMax,
  createVoieMax,
  createBelleOuverture,
  deleteBoulder,
  deleteContiBoucle,
  deleteAscension,
  deleteTest,
  deleteBlocMax,
  deleteVoieMax,
  deleteBelleOuverture,
  filterBoulders,
  filterContiBoucles,
  filterAscensions,
  filterTests,
  filterBlocMax,
  filterVoieMax,
  filterBelleOuvertures,
  listBoulders,
  listContiBoucles,
  listAscensions,
  listTests,
  listBlocMax,
  listVoieMax,
  listBelleOuvertures,
  updateBoulder,
  updateContiBoucle,
  updateAscension,
  updateTest,
  updateBlocMax,
  updateVoieMax,
  updateBelleOuverture,
} from "./entitiesDb";

/**
 * Server-first fetch helper that retries once after refresh and then throws to allow offline fallbacks.
 * @param {string} path - API path to call.
 * @param {RequestInit & {_retry?: boolean}} options - fetch options; _retry guards against infinite refresh.
 * @returns {Promise<any>} Parsed JSON response body.
 */
async function callServer(path, options = {}) {
  try {
    const defaultHeaders = { 'Content-Type': 'application/json' };
    // ...debug removed...
    const doFetch = (opts) => {
      // ...debug removed...
      return fetch(path, { credentials: 'include', headers: { ...defaultHeaders, ...(opts.headers || {}) }, ...opts });
    };
    let res = await doFetch(options);

    // If unauthorized, try to refresh using HttpOnly refresh cookie and retry once
    if (res.status === 401 && !options._retry) {
      try {
        const refreshRes = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
        if (refreshRes.status === 401) {
          // Force immediate re-authentication if refresh fails with 401
          try { localStorage.removeItem('currentUser'); } catch (e) {}
          window.location.href = '/Login';
          throw new Error('Session expired, please log in again');
        }
        if (refreshRes.ok) {
          const refreshBody = await refreshRes.json().catch(() => ({}));
          if (refreshBody?.user) localStorage.setItem('currentUser', JSON.stringify(refreshBody.user));
          // retry original request once
          res = await doFetch({ ...options, _retry: true });
        }
      } catch (e) {
        // ignore refresh errors, fall through to error handling
      }
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      // if still 401, clear stored local token/user to force re-login
      if (res.status === 401) {
        try { localStorage.removeItem('currentUser'); } catch (e) {}
      }
      throw new Error(body.error || res.statusText || 'Server error');
    }
    return res.json();
  } catch (err) {
    // propagate network errors to allow fallback
    throw err;
  }
}



export const Boulder = {
  /** Fetch all boulders (server-first, offline fallback). */
  list: async () => {
    try {
      const data = await callServer('/api/boulders', { method: 'GET' });
      return data?.boulders ?? [];
    } catch {
      return listBoulders();
    }
  },
  /** Filter boulders client-side after fetch; falls back to offline DB. */
  filter: async (query) => {
    try {
      const all = await Boulder.list();
      return all.filter((item) => Object.entries(query || {}).every(([k, v]) => String(item?.[k]) === String(v)));
    } catch {
      return filterBoulders(query);
    }
  },
  /** Get a boulder by id with server-first lookup. */
  get: async (id) => {
    const nid = parseInt(id);
    // try server first (if available), fallback to local DB
    try {
      const data = await callServer('/api/boulders', { method: 'GET' });
      const found = (data?.boulders ?? []).find(b => Number(b.id) === nid);
      if (found) {
        // ...debug removed...
        return found;
      }
      // ...debug removed...
    } catch (e) {
      // ...debug removed...
      // ignore and fallback to local
    }
    const boulders = await filterBoulders({ id: nid });
    if (boulders.length === 0) {
      // ...debug removed...
      throw new Error('Not found');
    }
    // ...debug removed...
    return boulders[0];
  },
  /** Create a boulder; server-first then offline. */
  create: async (data) => {
    try {
      const res = await callServer('/api/boulders', { method: 'POST', body: JSON.stringify(data) });
      return res.boulder;
    } catch {
      return createBoulder(data);
    }
  },
  /** Update a boulder by id; server-first then offline. */
  update: async (id, data) => {
    // ...debug removed...
    try {
      // ...debug removed...
      const res = await callServer(`/api/boulders/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
      // ...debug removed...
      return res.boulder;
    } catch (e) {
      // ...debug removed...
      return updateBoulder(id, data);
    }
  },
  /** Delete a boulder by id; server-first then offline. */
  delete: async (id) => {
    // Only allow server-side delete; do not fallback to local if unauthorized or error
    return await callServer(`/api/boulders/${id}`, { method: 'DELETE' });
  },
};

export const ContiBoucle = {
  /** Fetch all conti boucles (server-first, offline fallback). */
  list: async () => {
    try {
      const data = await callServer('/api/contiBoucles', { method: 'GET' });
      return data?.contiBoucles ?? [];
    } catch {
      return listContiBoucles();
    }
  },
  /** Filter conti boucles client-side after fetch. */
  filter: async (query) => {
    try {
      const all = await ContiBoucle.list();
      return all.filter((item) => Object.entries(query || {}).every(([k, v]) => String(item?.[k]) === String(v)));
    } catch {
      return filterContiBoucles(query);
    }
  },
  /** Get a conti boucle by id. */
  get: async (id) => {
    const boucles = await ContiBoucle.filter({ id: parseInt(id) });
    if (boucles.length === 0) throw new Error('Not found');
    return boucles[0];
  },
  /** Create a conti boucle. */
  create: async (data) => {
    try {
      const res = await callServer('/api/contiBoucles', { method: 'POST', body: JSON.stringify(data) });
      return res.contiBoucle;
    } catch {
      return createContiBoucle(data);
    }
  },
  /** Update a conti boucle by id. */
  update: async (id, data) => {
    try {
      // ...debug removed...
      const res = await callServer(`/api/contiBoucles/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
      // ...debug removed...
      return res.contiBoucle;
    } catch (e) {
      // ...debug removed...
      return updateContiBoucle(id, data);
    }
  },
  /** Delete a conti boucle by id. */
  delete: async (id) => {
    try {
      return await callServer(`/api/contiBoucles/${id}`, { method: 'DELETE' });
    } catch {
      return deleteContiBoucle(id);
    }
  },
};

export const Ascension = {
  /** Fetch ascension history (server-first). */
  list: async () => {
    try {
      const data = await callServer('/api/ascensions', { method: 'GET' });
      return data?.ascensions ?? [];
    } catch {
      return listAscensions();
    }
  },
  /** Filter ascensions client-side. */
  filter: async (query) => {
    try {
      const all = await Ascension.list();
      return all.filter((item) => Object.entries(query || {}).every(([k, v]) => String(item?.[k]) === String(v)));
    } catch {
      return filterAscensions(query);
    }
  },
  /** Get an ascension by id. */
  get: async (id) => {
    const ascensions = await Ascension.filter({ id: parseInt(id) });
    if (ascensions.length === 0) throw new Error('Not found');
    return ascensions[0];
  },
  /** Create an ascension entry. */
  create: async (data) => {
    try {
      const res = await callServer('/api/ascensions', { method: 'POST', body: JSON.stringify(data) });
      return res.ascension;
    } catch {
      return createAscension(data);
    }
  },
  /** Update an ascension entry. */
  update: async (id, data) => {
    try {
      const res = await callServer(`/api/ascensions/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
      return res.ascension;
    } catch {
      return updateAscension(id, data);
    }
  },
  /** Delete an ascension entry. */
  delete: async (id) => {
    try {
      return await callServer(`/api/ascensions/${id}`, { method: 'DELETE' });
    } catch {
      return deleteAscension(id);
    }
  },
};

export const Test = {
  /** List tests, normalizing legacy keys. */
  list: async () => {
    try {
      const data = await callServer('/api/tests', { method: 'GET' });
      const tests = data?.tests ?? [];
      return tests.map(t => ({
        ...t,
        type_test: t.type_test || t.type,
        valeur: t.valeur ?? t.score ?? 0,
      }));
    } catch {
      return listTests().map(t => ({
        ...t,
        type_test: t.type_test || t.type,
        valeur: t.valeur ?? t.score ?? 0,
      }));
    }
  },
  /** Filter tests client-side with normalization. */
  filter: async (query) => {
    try {
      const all = await Test.list();
      return all.filter((item) => Object.entries(query || {}).every(([k, v]) => String(item?.[k]) === String(v)));
    } catch {
      return filterTests(query).map(t => ({
        ...t,
        type_test: t.type_test || t.type,
        valeur: t.valeur ?? t.score ?? 0,
      }));
    }
  },
  /** Get a test by id. */
  get: async (id) => {
    const tests = await Test.filter({ id: parseInt(id) });
    if (tests.length === 0) throw new Error('Not found');
    return tests[0];
  },
  /** Create a test entry. */
  create: async (data) => {
    try {
      const res = await callServer('/api/tests', { method: 'POST', body: JSON.stringify(data) });
      return res.test;
    } catch {
      return createTest(data);
    }
  },
  /** Update a test entry. */
  update: async (id, data) => {
    try {
      const res = await callServer(`/api/tests/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
      return res.test;
    } catch {
      return updateTest(id, data);
    }
  },
  /** Delete a test entry. */
  delete: async (id) => {
    try {
      return await callServer(`/api/tests/${id}`, { method: 'DELETE' });
    } catch {
      return deleteTest(id);
    }
  },
};

export const BlocMax = {
  /** List bloc max records. */
  list: async () => {
    try {
      const data = await callServer('/api/blocMax', { method: 'GET' });
      return data?.blocMax ?? [];
    } catch {
      return listBlocMax();
    }
  },
  /** Filter bloc max records. */
  filter: async (query) => {
    try {
      const all = await BlocMax.list();
      return all.filter((item) => Object.entries(query || {}).every(([k, v]) => String(item?.[k]) === String(v)));
    } catch {
      return filterBlocMax(query);
    }
  },
  /** Get a bloc max record by id. */
  get: async (id) => {
    const blocMax = await BlocMax.filter({ id: parseInt(id) });
    if (blocMax.length === 0) throw new Error('Not found');
    return blocMax[0];
  },
  /** Create a bloc max record. */
  create: async (data) => {
    try {
      const res = await callServer('/api/blocMax', { method: 'POST', body: JSON.stringify(data) });
      return res.bloc;
    } catch {
      return createBlocMax(data);
    }
  },
  /** Update a bloc max record. */
  update: async (id, data) => {
    try {
      const res = await callServer(`/api/blocMax/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
      return res.bloc;
    } catch {
      return updateBlocMax(id, data);
    }
  },
  /** Delete a bloc max record. */
  delete: async (id) => {
    try {
      return await callServer(`/api/blocMax/${id}`, { method: 'DELETE' });
    } catch {
      return deleteBlocMax(id);
    }
  },
};

export const VoieMax = {
  /** List voie max records. */
  list: async () => {
    try {
      const data = await callServer('/api/voieMax', { method: 'GET' });
      return data?.voieMax ?? [];
    } catch {
      return listVoieMax();
    }
  },
  /** Filter voie max records. */
  filter: async (query) => {
    try {
      const all = await VoieMax.list();
      return all.filter((item) => Object.entries(query || {}).every(([k, v]) => String(item?.[k]) === String(v)));
    } catch {
      return filterVoieMax(query);
    }
  },
  /** Get a voie max record by id. */
  get: async (id) => {
    const voieMax = await VoieMax.filter({ id: parseInt(id) });
    if (voieMax.length === 0) throw new Error('Not found');
    return voieMax[0];
  },
  /** Create a voie max record. */
  create: async (data) => {
    try {
      const res = await callServer('/api/voieMax', { method: 'POST', body: JSON.stringify(data) });
      return res.voie;
    } catch {
      return createVoieMax(data);
    }
  },
  /** Update a voie max record. */
  update: async (id, data) => {
    try {
      const res = await callServer(`/api/voieMax/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
      return res.voie;
    } catch {
      return updateVoieMax(id, data);
    }
  },
  /** Delete a voie max record. */
  delete: async (id) => {
    try {
      return await callServer(`/api/voieMax/${id}`, { method: 'DELETE' });
    } catch {
      return deleteVoieMax(id);
    }
  },
};

export const BelleOuverture = {
  /** List belle ouvertures. */
  list: async () => {
    try {
      const data = await callServer('/api/belleOuvertures', { method: 'GET' });
      return data?.belleOuvertures ?? [];
    } catch {
      return listBelleOuvertures();
    }
  },
  /** Filter belle ouvertures. */
  filter: async (query) => {
    try {
      const all = await BelleOuverture.list();
      return all.filter((item) => Object.entries(query || {}).every(([k, v]) => String(item?.[k]) === String(v)));
    } catch {
      return filterBelleOuvertures(query);
    }
  },
  /** Get a belle ouverture by id. */
  get: async (id) => {
    const ouvertures = await BelleOuverture.filter({ id: parseInt(id) });
    if (ouvertures.length === 0) throw new Error('Not found');
    return ouvertures[0];
  },
  /** Create a belle ouverture. */
  create: async (data) => {
    try {
      const res = await callServer('/api/belleOuvertures', { method: 'POST', body: JSON.stringify(data) });
      return res.belle;
    } catch {
      return createBelleOuverture(data);
    }
  },
  /** Update a belle ouverture. */
  update: async (id, data) => {
    try {
      const res = await callServer(`/api/belleOuvertures/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
      return res.belle;
    } catch {
      return updateBelleOuverture(id, data);
    }
  },
  /** Delete a belle ouverture. */
  delete: async (id) => {
    try {
      return await callServer(`/api/belleOuvertures/${id}`, { method: 'DELETE' });
    } catch {
      return deleteBelleOuverture(id);
    }
  },
};

// Lieux (spray walls and holds)
export const SprayWall = {
  /** List spray walls. */
  list: async () => {
    try {
      const data = await callServer('/api/sprayWalls', { method: 'GET' });
      return data?.sprayWalls ?? [];
    } catch {
      return listSprayWalls();
    }
  },
  /** Filter spray walls. */
  filter: async (query) => {
    try { const all = await SprayWall.list(); return all.filter((item) => Object.entries(query || {}).every(([k, v]) => String(item?.[k]) === String(v))); } catch { return filterSprayWalls(query); }
  },
  /** Get a spray wall by id. */
  get: async (id) => {
    const walls = await SprayWall.filter({ id: parseInt(id) });
    if (walls.length === 0) throw new Error('Not found');
    return walls[0];
  },
  /** Create a spray wall. */
  create: async (data) => {
    try { const res = await callServer('/api/sprayWalls', { method: 'POST', body: JSON.stringify(data) }); return res.sprayWall; } catch { return createSprayWall(data); }
  },
  /** Update a spray wall. */
  update: async (id, data) => {
    try { const res = await callServer(`/api/sprayWalls/${id}`, { method: 'PATCH', body: JSON.stringify(data) }); return res.sprayWall; } catch { return updateSprayWall(id, data); }
  },
  /** Delete a spray wall. */
  delete: async (id) => {
    try { return await callServer(`/api/sprayWalls/${id}`, { method: 'DELETE' }); } catch { return deleteSprayWall(id); }
  },
};

export const Hold = {
  /** List holds across spray walls. */
  list: async () => {
    try { const data = await callServer('/api/holds', { method: 'GET' }); return data?.holds ?? []; } catch { return listHolds(); }
  },
  /** Filter holds. */
  filter: async (query) => {
    try { const all = await Hold.list(); return all.filter((item) => Object.entries(query || {}).every(([k, v]) => String(item?.[k]) === String(v))); } catch { return filterHolds(query); }
  },
  /** Create a hold. */
  create: async (data) => { try { const res = await callServer('/api/holds', { method: 'POST', body: JSON.stringify(data) }); return res.hold; } catch { return createHold(data); } },
  /** Update a hold. */
  update: async (id, data) => { try { const res = await callServer(`/api/holds/${id}`, { method: 'PATCH', body: JSON.stringify(data) }); return res.hold; } catch { return updateHold(id, data); } },
  /** Delete a hold. */
  delete: async (id) => { try { return await callServer(`/api/holds/${id}`, { method: 'DELETE' }); } catch { return deleteHold(id); } },
};

// auth functions
export const User = {
  /** Get current user (server-first, fallback to localStorage). */
  me: async () => {
    try {
      const res = await callServer('/api/auth/me', { method: 'GET' });
      return res.user ?? null;
    } catch {
      // Do not fall back to localStorage for session state
      return null;
    }
  },
  /** Navigate to login page. */
  redirectToLogin: () => {
    window.location.href = '/Login';
  },
  /** Update currently logged-in user. */
  updateMe: async (data) => {
    const user = await User.me();
    if (!user) throw new Error('Not logged in');
    try {
      const res = await callServer(`/api/users/${encodeURIComponent(user.username)}`, { method: 'PATCH', body: JSON.stringify(data) });
      const updated = res.user;
      localStorage.setItem('currentUser', JSON.stringify(updated));
      return updated;
    } catch {
      const updated = await updateUserByUsername(user.username, data);
      localStorage.setItem('currentUser', JSON.stringify(updated));
      return updated;
    }
  },
  /** Logout locally and attempt server logout. */
  logout: async () => {
    try {
      await callServer('/api/auth/logout', { method: 'POST' });
    } catch {}
    localStorage.removeItem('currentUser');
    window.location.href = '/Login';
  },
  /** Login with server-first auth and local fallback. */
  login: async (username, password) => {
    try {
      const res = await callServer('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
      const user = res.user;
      localStorage.setItem('currentUser', JSON.stringify(user));
      return user;
    } catch (err) {
      await ensureUsersDbSeeded();
      const ok = await verifyUserPassword({ username, password });
      if (!ok) throw new Error('Invalid credentials');
      const user = await findUserByUsername(username);
      if (!user) throw new Error('Invalid credentials');
      const { password_salt, password_hash, ...safeUser } = user;
      localStorage.setItem('currentUser', JSON.stringify(safeUser));
      return safeUser;
    }
  },
  /** Register a new user. */
  register: async ({ username, password, full_name }) => {
    try {
      const res = await callServer('/api/auth/register', { method: 'POST', body: JSON.stringify({ username, password, full_name }) });
      const user = res.user;
      localStorage.setItem('currentUser', JSON.stringify(user));
      return user;
    } catch {
      const user = await createUser({ username, password, full_name });
      localStorage.setItem('currentUser', JSON.stringify(user));
      return user;
    }
  },
  // Admin user management
  /** List users (admin). */
  list: async () => {
    try { const res = await callServer('/api/users', { method: 'GET' }); return res.users ?? []; } catch { return listUsers(); }
  },
  /** Create user (admin). */
  create: async (data) => {
    try {
      const res = await callServer('/api/users', { method: 'POST', body: JSON.stringify(data) });
      return res.user;
    } catch (err) {
      // Only fallback to local if it's a network error (no response)
      if (err && err.message && (
        err.message === 'Failed to fetch' ||
        err.message === 'NetworkError when attempting to fetch resource.'
      )) {
        return createUser(data);
      }
      // If the error is a Response object (e.g., fetch throws a Response), try to extract the error message
      if (err instanceof Response) {
        try {
          const body = await err.json();
          throw new Error(body.error || err.statusText || 'Server error');
        } catch (e) {
          throw new Error(err.statusText || 'Server error');
        }
      }
      // Otherwise, propagate the error (e.g., duplicate username)
      throw err;
    }
  },
  /** Update user by email (admin). */
  updateByUsername: async (username, patch) => {
    try { const res = await callServer(`/api/users/${encodeURIComponent(username)}`, { method: 'PATCH', body: JSON.stringify(patch) }); return res.user; } catch { return updateUserByUsername(username, patch); }
  },
  /** Delete user by username (admin). */
  deleteByUsername: async (username) => {
    try { const res = await callServer(`/api/users/${encodeURIComponent(username)}`, { method: 'DELETE' }); return res.user; } catch { return deleteUserByUsername(username); }
  },
  /** Find user by username. */
  findByUsername: async (username) => {
    try { const users = await User.list(); return users.find(u => String(u.username).toLowerCase() === String(username).toLowerCase()) ?? null; } catch { return findUserByUsername(username); }
  },
  /** Change password for current user (local fallback only). */
  changePassword: async (currentPassword, newPassword) => {
    const stored = localStorage.getItem('currentUser');
    if (!stored) throw new Error('Not logged in');
    const me = JSON.parse(stored);
    if (!me?.username) throw new Error('Not logged in');
    return changePasswordByUsername(me.username, currentPassword, newPassword);
  },
  /** Force-set password by username (admin offline helper). */
  setPasswordByUsername: async (username, newPassword) => setPasswordByUsername(username, newPassword),
};
