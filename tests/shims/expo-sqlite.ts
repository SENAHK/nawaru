// Minimal stand-in for expo-sqlite on top of node:sqlite, covering what
// Drizzle's Expo driver calls. Lets database queries run in Node tests.

import { DatabaseSync } from 'node:sqlite';

type Param = string | number | null;

const returnsRows = (sql: string) => /^\s*(select|with|pragma)\b/i.test(sql) || /\breturning\b/i.test(sql);

export function openDatabaseSync(_name: string) {
  const database = new DatabaseSync(':memory:');
  return {
    execSync: (sql: string) => database.exec(sql),
    prepareSync(sql: string) {
      return {
        executeSync(params: Param[] = []) {
          if (returnsRows(sql)) {
            const rows = database.prepare(sql).all(...params);
            return { changes: 0, lastInsertRowId: 0, getAllSync: () => rows, getFirstSync: () => rows[0] ?? null };
          }
          const result = database.prepare(sql).run(...params);
          return {
            changes: Number(result.changes),
            lastInsertRowId: Number(result.lastInsertRowid),
            getAllSync: () => [],
            getFirstSync: () => null,
          };
        },
        executeForRawResultSync(params: Param[] = []) {
          const statement = database.prepare(sql);
          statement.setReturnArrays(true);
          const rows = statement.all(...params);
          return { getAllSync: () => rows, getFirstSync: () => rows[0] ?? null };
        },
        finalizeSync() {},
      };
    },
  };
}

export function addDatabaseChangeListener() {
  return { remove() {} };
}
