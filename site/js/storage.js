/**
 * ImobiAires – persistent storage helpers
 *
 * Uses localStorage with no expiry.
 * Falls back to sessionStorage if localStorage is unavailable (private mode / blocked).
 * Favorites are stored under their own permanent key so they survive general cache clears.
 */

const PREFIX = 'imobiaires-';

/** Try localStorage first, then sessionStorage. Returns the available store or null. */
function getStore(preferSession = false) {
  const stores = preferSession
    ? [sessionStorage, localStorage]
    : [localStorage, sessionStorage];
  for (const s of stores) {
    try {
      const test = '__ia_test__';
      s.setItem(test, '1');
      s.removeItem(test);
      return s;
    } catch {
      // not available
    }
  }
  return null;
}

export function readStorage(key, fallback) {
  const store = getStore();
  if (!store) return fallback;
  try {
    const raw = store.getItem(PREFIX + key);
    return raw !== null ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function writeStorage(key, value, onError) {
  const store = getStore();
  if (!store) {
    if (onError) onError('Armazenamento local indisponível neste navegador.');
    return false;
  }
  try {
    store.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    if (onError) onError('Armazenamento local cheio. Libere espaço no navegador.');
    return false;
  }
}

/**
 * Read favorites — checks the new key first, then the old 't360-fav' key
 * so users who already had favorites don't lose them after the rename.
 */
export function readFavorites() {
  // Try new key
  const store = getStore();
  if (store) {
    const raw = store.getItem(PREFIX + 'fav');
    if (raw !== null) {
      try { return JSON.parse(raw); } catch { /* fall through */ }
    }
    // Migrate from old key (t360-fav) if present
    const legacy = store.getItem('t360-fav');
    if (legacy !== null) {
      try {
        const data = JSON.parse(legacy);
        // Migrate: save under new key, remove old
        store.setItem(PREFIX + 'fav', JSON.stringify(data));
        try { store.removeItem('t360-fav'); } catch { /* ignore */ }
        return data;
      } catch { /* fall through */ }
    }
  }
  return [];
}

export function writeFavorites(favArray, onError) {
  return writeStorage('fav', favArray, onError);
}
