import { drizzle } from 'drizzle-orm/expo-sqlite';
import { getRandomBytes } from 'expo-crypto';
import { openDatabaseSync } from 'expo-sqlite';

import { setRandomSource } from './ids';
import * as schema from './schema';

setRandomSource(getRandomBytes);

// The change listener powers Drizzle's `useLiveQuery`.
const sqlite = openDatabaseSync('nawaru.db', { enableChangeListener: true });
sqlite.execSync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

export const db = drizzle(sqlite, { schema });
export type Database = typeof db;

export { schema };
