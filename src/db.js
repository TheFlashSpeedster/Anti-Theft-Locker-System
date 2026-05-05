/**
 * Aether Sentinel — IndexedDB Log Persistence
 *
 * Stores event logs in the browser's IndexedDB so history survives:
 *  - ESP32 reboots (ring buffer cleared)
 *  - Page refreshes / browser restarts
 *
 * Schema:
 *   DB:    "aether-sentinel"  v1
 *   Store: "logs"  keyPath → "key"  (sha-like composite of ts+type+message)
 *   Index: "savedAt" (for pruning oldest entries)
 */

const DB_NAME    = 'aether-sentinel';
const STORE      = 'logs';
const VERSION    = 1;
const MAX_ENTRIES = 5000;   // cap: prune oldest when exceeded

// ── Open / initialise DB ────────────────────────────────────────────────────
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'key' });
        store.createIndex('savedAt', 'savedAt', { unique: false });
      }
    };

    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror   = (e) => reject(e.target.error);
  });
}

// ── Load all logs (newest first) ────────────────────────────────────────────
export async function loadLogs() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    const req   = store.index('savedAt').getAll();

    req.onsuccess = () => {
      // Sort newest-first; keep savedAt for UI sorting, strip internal key
      const sorted = (req.result || [])
        .sort((a, b) => b.savedAt - a.savedAt)
        .map(({ key, ...rest }) => rest);  // keep savedAt, strip only dedup key
      resolve(sorted);
    };
    req.onerror = () => reject(req.error);
  });
}

// ── Merge new log entries (idempotent) ──────────────────────────────────────────
// Safe to call with the same set of entries multiple times — duplicates are
// simply overwritten (IndexedDB put = upsert).
//
// savedAt is offset by index so that within a single poll batch the order
// from the ESP32 (oldest → newest at higher indices) is preserved:
//   entry[0] gets  now - (n-1),  entry[n-1] gets  now
// This ensures loadLogs() sorts them newest-first correctly.
export async function mergeLogs(newLogs) {
  if (!newLogs || newLogs.length === 0) return;

  const db  = await openDB();
  const tx  = db.transaction(STORE, 'readwrite');
  const store = tx.objectStore(STORE);
  const now  = Date.now();
  const n    = newLogs.length;

  newLogs.forEach((log, i) => {
    const key     = `${log.timestamp || ''}_${log.type || ''}_${(log.message || '').slice(0, 80)}`;
    // Oldest entries in the batch get a smaller savedAt so they sort after newer ones
    const savedAt = now - (n - 1 - i);
    store.put({ ...log, key, savedAt });
  });

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

// ── Prune oldest entries when we exceed MAX_ENTRIES ─────────────────────────
export async function pruneIfNeeded() {
  const db = await openDB();

  const count = await new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });

  if (count <= MAX_ENTRIES) return;

  // Fetch all sorted by savedAt ascending (oldest first), delete excess
  const all = await new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).index('savedAt').getAllKeys();
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });

  const toDelete = all.slice(0, count - MAX_ENTRIES);
  const tx = db.transaction(STORE, 'readwrite');
  const store = tx.objectStore(STORE);
  for (const key of toDelete) store.delete(key);

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

// ── Clear all stored logs ───────────────────────────────────────────────────
export async function clearAllLogs() {
  const db = await openDB();
  const tx  = db.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).clear();
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}
