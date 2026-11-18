import { addDatabaseChangeListener } from 'expo-sqlite';
import { useRef, useSyncExternalStore } from 'react';

// A counter bumped (at most once per frame) whenever any table changes, and
// after every navigation. Screens that read with synchronous queries depend on
// it to refresh (see useDbQuery).

type Store = {
  version: number;
  scheduled: boolean;
  listeners: Set<() => void>;
};

// Kept on globalThis so a Fast Refresh of this module reuses the same counter
// and database listener instead of starting a second, disconnected copy.
const globalStore = globalThis as { __nawaruDbVersion?: Store };
const store: Store = (globalStore.__nawaruDbVersion ??= (() => {
  const created: Store = { version: 0, scheduled: false, listeners: new Set() };
  addDatabaseChangeListener(() => scheduleBump(created));
  return created;
})());

function scheduleBump(target: Store) {
  if (target.scheduled) return;
  target.scheduled = true;
  setTimeout(() => {
    target.scheduled = false;
    target.version += 1;
    for (const listener of target.listeners) listener();
  }, 16);
}

/**
 * Makes every mounted query read again. Called after each navigation, so a
 * screen coming back into view never shows rows from before a change made on
 * another screen.
 */
export function refreshDbQueries(): void {
  scheduleBump(store);
}

function subscribe(listener: () => void) {
  store.listeners.add(listener);
  return () => {
    store.listeners.delete(listener);
  };
}

export function useDbVersion(): number {
  return useSyncExternalStore(subscribe, () => store.version);
}

/**
 * Runs a synchronous database read and re-runs it when `key` changes or when
 * the database changes. `key` must identify everything the read depends on.
 *
 * The result is a `useSyncExternalStore` snapshot cached per database version:
 * React re-checks it on every render and every change, so a render that is
 * interrupted (navigation, concurrent updates) cannot leave stale rows behind.
 */
export function useDbQuery<T>(read: () => T, key: string): T {
  const cache = useRef<{ version: number; key: string; value: T } | null>(null);
  const getSnapshot = () => {
    const current = cache.current;
    if (current && current.version === store.version && current.key === key) return current.value;
    const value = read();
    cache.current = { version: store.version, key, value };
    return value;
  };
  return useSyncExternalStore(subscribe, getSnapshot);
}
