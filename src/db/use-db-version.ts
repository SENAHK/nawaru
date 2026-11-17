import { addDatabaseChangeListener } from 'expo-sqlite';
import { useState, useSyncExternalStore } from 'react';

// A counter bumped (at most once per frame) whenever any table changes.
// Screens that read with synchronous queries depend on it to refresh.
let version = 0;
let scheduled = false;
const listeners = new Set<() => void>();

addDatabaseChangeListener(() => {
  if (scheduled) return;
  scheduled = true;
  setTimeout(() => {
    scheduled = false;
    version += 1;
    for (const listener of listeners) listener();
  }, 16);
});

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useDbVersion(): number {
  return useSyncExternalStore(subscribe, () => version);
}

/**
 * Runs a synchronous database read and re-runs it when `key` changes or when
 * the database changes. `key` must identify everything the read depends on.
 */
export function useDbQuery<T>(read: () => T, key: string): T {
  const dbVersion = useDbVersion();
  const [cache, setCache] = useState(() => ({ key, dbVersion, value: read() }));
  if (cache.key !== key || cache.dbVersion !== dbVersion) {
    // Derived state: refresh during render so the screen never shows stale rows.
    const next = { key, dbVersion, value: read() };
    setCache(next);
    return next.value;
  }
  return cache.value;
}
