/** Offline spray wall/hold store persisted in localStorage for fallback usage. */
const STORAGE_KEY = "cheffs.lieux.db.v1";

/** Read offline spray wall/hold store from localStorage. */
function readDb() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Persist snapshot to localStorage. */
function writeDb(db) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

/** Compute simple auto-increment id client-side. */
function nextId(items) {
  const max = (items ?? []).reduce((acc, item) => Math.max(acc, item.id ?? 0), 0);
  return max + 1;
}

/** Equality-based query matcher used by filter helpers. */
function matchesQuery(item, query) {
  return Object.entries(query).every(([key, value]) => {
    const itemValue = item?.[key];
    if (itemValue == null && value == null) return true;
    return String(itemValue) === String(value);
  });
}

/** Seed a default wall and holds for offline usage if none exists. */
export function ensureLieuxDbSeeded() {
  const existing = readDb();
  if (
    existing?.version === 1 &&
    Array.isArray(existing.sprayWalls) &&
    Array.isArray(existing.holds)
  ) {
    return;
  }

  const now = Date.now();
  const sprayWalls = [
    {
      id: 1,
      nom: "Default Wall",
      lieu: "Local (offline)",
      description: "Default spray wall for testing",
      photo_url: "",
      sous_admin_email: null,
      created_at: now,
      updated_at: now,
    },
  ];

  const holds = [
    { id: 1, spray_wall_id: 1, nom: "Hold 1", x: 100, y: 100 },
    { id: 2, spray_wall_id: 1, nom: "Hold 2", x: 200, y: 150 },
    { id: 3, spray_wall_id: 1, nom: "Hold 3", x: 300, y: 200 },
    { id: 4, spray_wall_id: 1, nom: "Hold 4", x: 150, y: 250 },
    { id: 5, spray_wall_id: 1, nom: "Hold 5", x: 250, y: 300 },
    { id: 6, spray_wall_id: 1, nom: "Hold 6", x: 350, y: 350 },
    { id: 7, spray_wall_id: 1, nom: "Hold 7", x: 100, y: 400 },
    { id: 8, spray_wall_id: 1, nom: "Hold 8", x: 200, y: 450 },
    { id: 9, spray_wall_id: 1, nom: "Hold 9", x: 300, y: 500 },
    { id: 10, spray_wall_id: 1, nom: "Hold 10", x: 150, y: 550 },
  ].map((h) => ({ ...h, created_at: now, updated_at: now }));

  writeDb({ version: 1, sprayWalls, holds });
}

/** List spray walls from offline store. */
export async function listSprayWalls() {
  ensureLieuxDbSeeded();
  const db = readDb();
  return db?.sprayWalls ?? [];
}

/** Filter spray walls by query. */
export async function filterSprayWalls(query) {
  ensureLieuxDbSeeded();
  const db = readDb();
  return (db?.sprayWalls ?? []).filter((item) => matchesQuery(item, query ?? {}));
}

/** Create spray wall entry in offline store. */
export async function createSprayWall(data) {
  // Create spray wall entry in offline store
  ensureLieuxDbSeeded();
  const db = readDb() ?? { version: 1, sprayWalls: [], holds: [] };
  const now = Date.now();
  const newItem = {
    id: nextId(db.sprayWalls),
    nom: data?.nom ?? "",
    lieu: data?.lieu ?? "",
    description: data?.description ?? "",
    photo_url: data?.photo_url ?? "",
    sous_admin_email: data?.sous_admin_email ?? null,
    created_at: now,
    updated_at: now,
  };
  db.sprayWalls = [...(db.sprayWalls ?? []), newItem];
  writeDb(db);
  return newItem;
}

/** Update spray wall by id (keeps id stable). */
export async function updateSprayWall(id, patch) {
  // Patch spray wall while keeping id stable
  ensureLieuxDbSeeded();
  const db = readDb();
  if (!db?.sprayWalls) throw new Error("DB not initialized");

  const index = db.sprayWalls.findIndex((w) => String(w.id) === String(id));
  if (index === -1) throw new Error("Not found");

  const updated = {
    ...db.sprayWalls[index],
    ...patch,
    id: db.sprayWalls[index].id,
    updated_at: Date.now(),
  };

  db.sprayWalls = [...db.sprayWalls.slice(0, index), updated, ...db.sprayWalls.slice(index + 1)];
  writeDb(db);
  return updated;
}

/** Delete a wall and cascade delete its holds. */
export async function deleteSprayWall(id) {
  // Delete a wall and cascade delete its holds
  ensureLieuxDbSeeded();
  const db = readDb();
  if (!db?.sprayWalls) throw new Error("DB not initialized");

  const index = db.sprayWalls.findIndex((w) => String(w.id) === String(id));
  if (index === -1) throw new Error("Not found");

  const sprayWallId = db.sprayWalls[index].id;
  db.sprayWalls = [...db.sprayWalls.slice(0, index), ...db.sprayWalls.slice(index + 1)];

  // Cascade delete holds for this wall
  db.holds = (db.holds ?? []).filter((h) => String(h.spray_wall_id) !== String(sprayWallId));

  writeDb(db);
  return { success: true };
}

/** List holds from offline store. */
export async function listHolds() {
  ensureLieuxDbSeeded();
  const db = readDb();
  return db?.holds ?? [];
}

/** Filter holds by query object. */
export async function filterHolds(query) {
  ensureLieuxDbSeeded();
  const db = readDb();
  return (db?.holds ?? []).filter((item) => matchesQuery(item, query ?? {}));
}

/** Insert a hold tied to a spray wall. */
export async function createHold(data) {
  // Insert a hold tied to a spray wall
  ensureLieuxDbSeeded();
  const db = readDb() ?? { version: 1, sprayWalls: [], holds: [] };
  const now = Date.now();
  const newItem = {
    id: nextId(db.holds),
    spray_wall_id: data?.spray_wall_id ?? null,
    nom: data?.nom ?? "",
    x: data?.x ?? 0,
    y: data?.y ?? 0,
    created_at: now,
    updated_at: now,
  };
  db.holds = [...(db.holds ?? []), newItem];
  writeDb(db);
  return newItem;
}

/** Update hold coordinates/metadata. */
export async function updateHold(id, patch) {
  // Update hold coordinates/metadata
  ensureLieuxDbSeeded();
  const db = readDb();
  if (!db?.holds) throw new Error("DB not initialized");

  const index = db.holds.findIndex((h) => String(h.id) === String(id));
  if (index === -1) throw new Error("Not found");

  const updated = {
    ...db.holds[index],
    ...patch,
    id: db.holds[index].id,
    updated_at: Date.now(),
  };

  db.holds = [...db.holds.slice(0, index), updated, ...db.holds.slice(index + 1)];
  writeDb(db);
  return updated;
}

/** Remove hold entry by id. */
export async function deleteHold(id) {
  // Remove hold entry by id
  ensureLieuxDbSeeded();
  const db = readDb();
  if (!db?.holds) throw new Error("DB not initialized");

  const index = db.holds.findIndex((h) => String(h.id) === String(id));
  if (index === -1) throw new Error("Not found");

  db.holds = [...db.holds.slice(0, index), ...db.holds.slice(index + 1)];
  writeDb(db);
  return { success: true };
}

