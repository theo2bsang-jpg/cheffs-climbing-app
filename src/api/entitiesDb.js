/**
 * Offline entity store (boulders, conti boucles, ascensions, tests, max records, belles ouvertures)
 * persisted in localStorage. Used as a fallback when the server is unavailable.
 */
const STORAGE_KEY = "cheffs.entities.db.v1";

/** Read serialized offline DB snapshot from localStorage. */
function readDb() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Persist the in-memory snapshot to localStorage. */
function writeDb(db) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

/** Compute the next auto-increment id locally. */
function nextId(items) {
  const max = (items ?? []).reduce((acc, item) => Math.max(acc, item.id ?? 0), 0);
  return max + 1;
}

/** Simple field equality matcher used by filter helpers. */
function matchesQuery(item, query) {
  return Object.entries(query).every(([key, value]) => {
    const itemValue = item?.[key];
    if (itemValue == null && value == null) return true;
    // Special case for id: match string/number
    if (key === 'id') {
      return String(itemValue) === String(value);
    }
    return String(itemValue) === String(value);
  });
}

/** Lazily initialize offline entities store when missing or version mismatch. */
export function ensureEntitiesDbSeeded() {
  const existing = readDb();
  if (
    existing?.version === 1 &&
    Array.isArray(existing.boulders) &&
    Array.isArray(existing.contiBoucles) &&
    Array.isArray(existing.ascensions) &&
    Array.isArray(existing.tests) &&
    Array.isArray(existing.blocMax) &&
    Array.isArray(existing.voieMax) &&
    Array.isArray(existing.belleOuvertures)
  ) {
    return;
  }

  const now = Date.now();
  // Do not seed belle ouvertures with hardcoded created_by accounts.
  const belleOuvertures = [];

  writeDb({
    version: 1,
    boulders: [],
    contiBoucles: [],
    ascensions: [],
    tests: [],
    blocMax: [],
    voieMax: [],
    belleOuvertures
  });
}

// Boulder operations
/** List boulders from offline store. */
export async function listBoulders() {
  ensureEntitiesDbSeeded();
  const db = readDb();
  return db?.boulders ?? [];
}

/** Filter boulders by query object. */
export async function filterBoulders(query) {
  ensureEntitiesDbSeeded();
  const db = readDb();
  return (db?.boulders ?? []).filter((item) => matchesQuery(item, query ?? {}));
}

/** Create a boulder in offline store. */
export async function createBoulder(data) {
  // Insert a boulder into offline store; mirror server shape
  ensureEntitiesDbSeeded();
  const db = readDb() ?? { version: 1, boulders: [], contiBoucles: [], ascensions: [], tests: [], blocMax: [], voieMax: [], belleOuvertures: [] };
  const now = Date.now();
  const newItem = {
    id: nextId(db.boulders),
    nom: data?.nom ?? "",
    ouvreur: data?.ouvreur ?? "",
    niveau: data?.niveau ?? "",
    spray_wall_id: data?.spray_wall_id ?? null,
    match_autorise: data?.match_autorise ?? false,
    pied_sur_main_autorise: data?.pied_sur_main_autorise ?? false,
    holds: data?.holds ?? [],
    created_by: data?.created_by ?? null,
    created_at: now,
    updated_at: now,
  };
  db.boulders = [...(db.boulders ?? []), newItem];
  writeDb(db);
  return newItem;
}

/** Update a boulder by id in offline store. */
export async function updateBoulder(id, patch) {
  // Merge updates while preserving immutable id
  ensureEntitiesDbSeeded();
  const db = readDb();
  if (!db?.boulders) throw new Error("DB not initialized");

  const index = db.boulders.findIndex((b) => String(b.id) === String(id));
  if (index === -1) throw new Error("Not found");

  const updated = {
    ...db.boulders[index],
    ...patch,
    id: db.boulders[index].id,
    updated_at: Date.now(),
  };

  db.boulders = [...db.boulders.slice(0, index), updated, ...db.boulders.slice(index + 1)];
  writeDb(db);
  return updated;
}

/** Delete a boulder by id in offline store. */
export async function deleteBoulder(id) {
  // Remove a boulder locally and return success flag
  ensureEntitiesDbSeeded();
  const db = readDb();
  if (!db?.boulders) throw new Error("DB not initialized");

  const index = db.boulders.findIndex((b) => String(b.id) === String(id));
  if (index === -1) throw new Error("Not found");

  db.boulders = [...db.boulders.slice(0, index), ...db.boulders.slice(index + 1)];
  writeDb(db);
  return { success: true };
}

// ContiBoucle operations
/** List conti boucles from offline store. */
export async function listContiBoucles() {
  ensureEntitiesDbSeeded();
  const db = readDb();
  return db?.contiBoucles ?? [];
}

/** Filter conti boucles by query. */
export async function filterContiBoucles(query) {
  ensureEntitiesDbSeeded();
  const db = readDb();
  const results = (db?.contiBoucles ?? []).filter((item) => matchesQuery(item, query ?? {}));
  // Add virtual 'niveau' field for frontend compatibility
  return results.map(item => ({ ...item, niveau: item.niveau_min }));
}

/** Create a conti boucle entry offline. */
export async function createContiBoucle(data) {
  // Create a conti boucle offline entry
  ensureEntitiesDbSeeded();
  const db = readDb() ?? { version: 1, boulders: [], contiBoucles: [], ascensions: [], tests: [], blocMax: [], voieMax: [], belleOuvertures: [] };
  const now = Date.now();
  // Support both 'niveau' and 'niveau_min'/'niveau_max'
  const niveauMin = data?.niveau_min ?? data?.niveau ?? "";
  const niveauMax = data?.niveau_max ?? data?.niveau ?? "";
  const newItem = {
    id: nextId(db.contiBoucles),
    nom: data?.nom ?? "",
    ouvreur: data?.ouvreur ?? "",
    description: data?.description ?? "",
    spray_wall_id: data?.spray_wall_id ?? null,
    niveau_min: niveauMin,
    niveau_max: niveauMax,
    niveau: niveauMin, // Add virtual field
    match_autorise: data?.match_autorise ?? false,
    pied_sur_main_autorise: data?.pied_sur_main_autorise ?? false,
    prise_remplacee: data?.prise_remplacee ?? false,
    holds: data?.holds ?? [],
    created_by: data?.created_by ?? null,
    created_at: now,
    updated_at: now,
  };
  db.contiBoucles = [...(db.contiBoucles ?? []), newItem];
  writeDb(db);
  return newItem;
}

/** Update conti boucle by id. */
export async function updateContiBoucle(id, patch) {
  // Patch conti boucle while keeping id stable
  ensureEntitiesDbSeeded();
  const db = readDb();
  if (!db?.contiBoucles) throw new Error("DB not initialized");

  const index = db.contiBoucles.findIndex((c) => String(c.id) === String(id));
  if (index === -1) throw new Error("Not found");

  // Support both 'niveau' and 'niveau_min'/'niveau_max'
  const niveauMin = patch.niveau_min ?? patch.niveau ?? db.contiBoucles[index].niveau_min;
  const niveauMax = patch.niveau_max ?? patch.niveau ?? db.contiBoucles[index].niveau_max;

  const updated = {
    ...db.contiBoucles[index],
    ...patch,
    niveau_min: niveauMin,
    niveau_max: niveauMax,
    niveau: niveauMin, // Add virtual field
    id: db.contiBoucles[index].id,
    updated_at: Date.now(),
  };

  db.contiBoucles = [...db.contiBoucles.slice(0, index), updated, ...db.contiBoucles.slice(index + 1)];
  writeDb(db);
  return updated;
}

/** Delete conti boucle by id. */
export async function deleteContiBoucle(id) {
  // Remove conti boucle by id
  ensureEntitiesDbSeeded();
  const db = readDb();
  if (!db?.contiBoucles) throw new Error("DB not initialized");

  const index = db.contiBoucles.findIndex((c) => String(c.id) === String(id));
  if (index === -1) throw new Error("Not found");

  db.contiBoucles = [...db.contiBoucles.slice(0, index), ...db.contiBoucles.slice(index + 1)];
  writeDb(db);
  return { success: true };
}

// Ascension operations
/** List ascensions from offline store. */
export async function listAscensions() {
  ensureEntitiesDbSeeded();
  const db = readDb();
  return db?.ascensions ?? [];
}

/** Filter ascensions by query. */
export async function filterAscensions(query) {
  ensureEntitiesDbSeeded();
  const db = readDb();
  return (db?.ascensions ?? []).filter((item) => matchesQuery(item, query ?? {}));
}

/** Create an ascension entry offline. */
export async function createAscension(data) {
  // Store an ascension entry with UI-friendly defaults
  ensureEntitiesDbSeeded();
  const db = readDb() ?? { version: 1, boulders: [], contiBoucles: [], ascensions: [], tests: [], blocMax: [], voieMax: [], belleOuvertures: [] };
  const now = Date.now();
  const newItem = {
    id: nextId(db.ascensions),
    // keep fields used by the UI
    boulder_id: data?.boulder_id ?? null,
    boulder_nom: data?.boulder_nom ?? data?.nom ?? "",
    boulder_niveau: data?.boulder_niveau ?? data?.niveau ?? "",
    type: data?.type ?? "",
    style: data?.style ?? "flash",
    spray_wall_id: data?.spray_wall_id ?? null,
    user_email: data?.user_email ?? data?.created_by ?? "",
    essais: data?.essais ?? 1,
    notes: data?.notes ?? "",
    date: data?.date ?? now,
    created_at: now,
    updated_at: now,
  };
  db.ascensions = [...(db.ascensions ?? []), newItem];
  writeDb(db);
  return newItem;
}

/** Update an ascension by id. */
export async function updateAscension(id, patch) {
  // Patch ascension and refresh updated timestamp
  ensureEntitiesDbSeeded();
  const db = readDb();
  if (!db?.ascensions) throw new Error("DB not initialized");

  const index = db.ascensions.findIndex((a) => String(a.id) === String(id));
  if (index === -1) throw new Error("Not found");

  const updated = {
    ...db.ascensions[index],
    ...patch,
    id: db.ascensions[index].id,
    updated_at: Date.now(),
  };

  db.ascensions = [...db.ascensions.slice(0, index), updated, ...db.ascensions.slice(index + 1)];
  writeDb(db);
  return updated;
}

/** Delete an ascension by id. */
export async function deleteAscension(id) {
  // Delete ascension by id
  ensureEntitiesDbSeeded();
  const db = readDb();
  if (!db?.ascensions) throw new Error("DB not initialized");

  const index = db.ascensions.findIndex((a) => String(a.id) === String(id));
  if (index === -1) throw new Error("Not found");

  db.ascensions = [...db.ascensions.slice(0, index), ...db.ascensions.slice(index + 1)];
  writeDb(db);
  return { success: true };
}

// Test operations
/** List tests from offline store. */
export async function listTests() {
  ensureEntitiesDbSeeded();
  const db = readDb();
  return db?.tests ?? [];
}

/** Filter tests by query. */
export async function filterTests(query) {
  ensureEntitiesDbSeeded();
  const db = readDb();
  return (db?.tests ?? []).filter((item) => matchesQuery(item, query ?? {}));
}

/** Create a test entry offline. */
export async function createTest(data) {
  // Normalize legacy/modern keys before persisting test
  ensureEntitiesDbSeeded();
  const db = readDb() ?? { version: 1, boulders: [], contiBoucles: [], ascensions: [], tests: [], blocMax: [], voieMax: [], belleOuvertures: [] };
  const now = Date.now();
  const newItem = {
    id: nextId(db.tests),
    user_email: data?.user_email ?? data?.created_by ?? "",
    // keep both legacy UI keys and normalized keys
    type: data?.type ?? data?.type_test ?? "",
    type_test: data?.type_test ?? data?.type ?? "",
    score: data?.score ?? data?.valeur ?? 0,
    valeur: data?.valeur ?? data?.score ?? 0,
    max_score: data?.max_score ?? data?.max ?? 100,
    date: data?.date ?? now,
    notes: data?.notes ?? "",
    created_at: now,
    updated_at: now,
  };
  db.tests = [...(db.tests ?? []), newItem];
  writeDb(db);
  return newItem;
}

/** Update a test by id. */
export async function updateTest(id, patch) {
  // Update test record while retaining id
  ensureEntitiesDbSeeded();
  const db = readDb();
  if (!db?.tests) throw new Error("DB not initialized");

  const index = db.tests.findIndex((t) => String(t.id) === String(id));
  if (index === -1) throw new Error("Not found");

  const updated = {
    ...db.tests[index],
    ...patch,
    id: db.tests[index].id,
    updated_at: Date.now(),
  };

  db.tests = [...db.tests.slice(0, index), updated, ...db.tests.slice(index + 1)];
  writeDb(db);
  return updated;
}

/** Delete a test by id. */
export async function deleteTest(id) {
  // Delete test by id
  ensureEntitiesDbSeeded();
  const db = readDb();
  if (!db?.tests) throw new Error("DB not initialized");

  const index = db.tests.findIndex((t) => String(t.id) === String(id));
  if (index === -1) throw new Error("Not found");

  db.tests = [...db.tests.slice(0, index), ...db.tests.slice(index + 1)];
  writeDb(db);
  return { success: true };
}

// BlocMax operations
/** List blocMax entries offline. */
export async function listBlocMax() {
  ensureEntitiesDbSeeded();
  const db = readDb();
  return db?.blocMax ?? [];
}

/** Filter blocMax entries. */
export async function filterBlocMax(query) {
  ensureEntitiesDbSeeded();
  const db = readDb();
  return (db?.blocMax ?? []).filter((item) => matchesQuery(item, query ?? {}));
}

/** Create a blocMax entry offline. */
export async function createBlocMax(data) {
  // Record max boulder performance; accepts varied key names
  ensureEntitiesDbSeeded();
  const db = readDb() ?? { version: 1, boulders: [], contiBoucles: [], ascensions: [], tests: [], blocMax: [], voieMax: [], belleOuvertures: [] };
  const now = Date.now();
  const newItem = {
    id: nextId(db.blocMax),
    user_email: data?.user_email ?? data?.created_by ?? "",
    nom: data?.nom ?? "",
    lieu: data?.lieu ?? data?.location ?? "",
    niveau: data?.niveau ?? "",
    style: data?.style ?? data?.mode ?? "flash",
    essais: data?.essais ?? data?.nombre_essais ?? undefined,
    date: data?.date ?? data?.date_achieved ?? now,
    notes: data?.notes ?? "",
    boulder_id: data?.boulder_id ?? null,
    created_at: now,
    updated_at: now,
  };
  db.blocMax = [...(db.blocMax ?? []), newItem];
  writeDb(db);
  return newItem;
}

/** Update a blocMax entry by id. */
export async function updateBlocMax(id, patch) {
  // Update blocMax entry
  ensureEntitiesDbSeeded();
  const db = readDb();
  if (!db?.blocMax) throw new Error("DB not initialized");

  const index = db.blocMax.findIndex((b) => String(b.id) === String(id));
  if (index === -1) throw new Error("Not found");

  const updated = {
    ...db.blocMax[index],
    ...patch,
    id: db.blocMax[index].id,
    updated_at: Date.now(),
  };

  db.blocMax = [...db.blocMax.slice(0, index), updated, ...db.blocMax.slice(index + 1)];
  writeDb(db);
  return updated;
}

/** Delete a blocMax entry by id. */
export async function deleteBlocMax(id) {
  // Remove blocMax entry
  ensureEntitiesDbSeeded();
  const db = readDb();
  if (!db?.blocMax) throw new Error("DB not initialized");

  const index = db.blocMax.findIndex((b) => String(b.id) === String(id));
  if (index === -1) throw new Error("Not found");

  db.blocMax = [...db.blocMax.slice(0, index), ...db.blocMax.slice(index + 1)];
  writeDb(db);
  return { success: true };
}

// VoieMax operations
/** List voieMax entries offline. */
export async function listVoieMax() {
  ensureEntitiesDbSeeded();
  const db = readDb();
  return db?.voieMax ?? [];
}

/** Filter voieMax entries. */
export async function filterVoieMax(query) {
  ensureEntitiesDbSeeded();
  const db = readDb();
  return (db?.voieMax ?? []).filter((item) => matchesQuery(item, query ?? {}));
}

/** Create a voieMax entry offline. */
export async function createVoieMax(data) {
  ensureEntitiesDbSeeded();
  const db = readDb() ?? { version: 1, boulders: [], contiBoucles: [], ascensions: [], tests: [], blocMax: [], voieMax: [], belleOuvertures: [] };
  const now = Date.now();
  const newItem = {
    id: nextId(db.voieMax),
    user_email: data?.user_email ?? data?.created_by ?? "",
    nom: data?.nom ?? "",
    lieu: data?.lieu ?? data?.location ?? "",
    niveau: data?.niveau ?? "",
    style: data?.style ?? "flash",
    essais: data?.essais ?? undefined,
    date: data?.date ?? data?.date_achieved ?? now,
    notes: data?.notes ?? "",
    voie_id: data?.voie_id ?? null,
    created_at: now,
    updated_at: now,
  };
  db.voieMax = [...(db.voieMax ?? []), newItem];
  writeDb(db);
  return newItem;
}

/** Update a voieMax entry by id. */
export async function updateVoieMax(id, patch) {
  ensureEntitiesDbSeeded();
  const db = readDb();
  if (!db?.voieMax) throw new Error("DB not initialized");

  const index = db.voieMax.findIndex((v) => String(v.id) === String(id));
  if (index === -1) throw new Error("Not found");

  const updated = {
    ...db.voieMax[index],
    ...patch,
    id: db.voieMax[index].id,
    updated_at: Date.now(),
  };

  db.voieMax = [...db.voieMax.slice(0, index), updated, ...db.voieMax.slice(index + 1)];
  writeDb(db);
  return updated;
}

/** Delete a voieMax entry by id. */
export async function deleteVoieMax(id) {
  ensureEntitiesDbSeeded();
  const db = readDb();
  if (!db?.voieMax) throw new Error("DB not initialized");

  const index = db.voieMax.findIndex((v) => String(v.id) === String(id));
  if (index === -1) throw new Error("Not found");

  db.voieMax = [...db.voieMax.slice(0, index), ...db.voieMax.slice(index + 1)];
  writeDb(db);
  return { success: true };
}

// BelleOuverture operations
/** List belles ouvertures offline. */
export async function listBelleOuvertures() {
  ensureEntitiesDbSeeded();
  const db = readDb();
  return db?.belleOuvertures ?? [];
}

/** Filter belles ouvertures. */
export async function filterBelleOuvertures(query) {
  ensureEntitiesDbSeeded();
  const db = readDb();
  return (db?.belleOuvertures ?? []).filter((item) => matchesQuery(item, query ?? {}));
}

/** Create a belle ouverture offline. */
export async function createBelleOuverture(data) {
  ensureEntitiesDbSeeded();
  const db = readDb() ?? { version: 1, boulders: [], contiBoucles: [], ascensions: [], tests: [], blocMax: [], voieMax: [], belleOuvertures: [] };
  const now = Date.now();
  const newItem = {
    id: nextId(db.belleOuvertures),
    nom: data?.nom ?? "",
    description: data?.description ?? "",
    photo_url: data?.photo_url ?? "",
    created_by: data?.created_by ?? null,
    niveau: data?.niveau ?? "",
    ouvreur: data?.ouvreur ?? "",
    spray_wall_id: data?.spray_wall_id ?? null,
    created_at: now,
    updated_at: now,
  };
  db.belleOuvertures = [...(db.belleOuvertures ?? []), newItem];
  writeDb(db);
  return newItem;
}

/** Update a belle ouverture by id. */
export async function updateBelleOuverture(id, patch) {
  ensureEntitiesDbSeeded();
  const db = readDb();
  if (!db?.belleOuvertures) throw new Error("DB not initialized");

  const index = db.belleOuvertures.findIndex((b) => String(b.id) === String(id));
  if (index === -1) throw new Error("Not found");

  const updated = {
    ...db.belleOuvertures[index],
    ...patch,
    id: db.belleOuvertures[index].id,
    updated_at: Date.now(),
  };

  db.belleOuvertures = [...db.belleOuvertures.slice(0, index), updated, ...db.belleOuvertures.slice(index + 1)];
  writeDb(db);
  return updated;
}

/** Delete a belle ouverture by id. */
export async function deleteBelleOuverture(id) {
  ensureEntitiesDbSeeded();
  const db = readDb();
  if (!db?.belleOuvertures) throw new Error("DB not initialized");

  const index = db.belleOuvertures.findIndex((b) => String(b.id) === String(id));
  if (index === -1) throw new Error("Not found");

  db.belleOuvertures = [...db.belleOuvertures.slice(0, index), ...db.belleOuvertures.slice(index + 1)];
  writeDb(db);
  return { success: true };
}