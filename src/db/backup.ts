// JSON backup of every table (docs/screens.md S13, Data). The only protection
// against losing the phone while all data is local.

import { sql } from 'drizzle-orm';

import { db } from './client';

export const BACKUP_FORMAT = 1;
const APP = 'nawaru';

/** Local-only or internal tables that never go in a backup. */
const SKIPPED = new Set(['active_timer', '__drizzle_migrations']);

type Row = Record<string, unknown>;

export type Backup = {
  app: typeof APP;
  format: typeof BACKUP_FORMAT;
  /** Number of migrations applied: a backup from a newer app version is refused. */
  schemaVersion: number;
  exportedAt: string;
  tables: Record<string, Row[]>;
};

type Reader = Pick<typeof db, 'all'>;

function tableNames(reader: Reader): string[] {
  return reader
    .all<{ name: string }>(
      sql`select name from sqlite_master where type = 'table' and name not like 'sqlite_%' order by name`,
    )
    .map((row) => row.name)
    .filter((name) => !SKIPPED.has(name));
}

function columnsOf(reader: Reader, table: string): string[] {
  return reader.all<{ name: string }>(sql`select name from pragma_table_info(${table})`).map((row) => row.name);
}

function schemaVersion(reader: Reader): number {
  const [exists] = reader.all<{ count: number }>(
    sql`select count(*) as count from sqlite_master where type = 'table' and name = '__drizzle_migrations'`,
  );
  if (!exists?.count) return 0;
  const [row] = reader.all<{ count: number }>(sql`select count(*) as count from __drizzle_migrations`);
  return row?.count ?? 0;
}

export function exportBackup(now = new Date()): Backup {
  const tables: Record<string, Row[]> = {};
  for (const name of tableNames(db)) {
    tables[name] = db.all<Row>(sql`select * from ${sql.identifier(name)}`);
  }
  return { app: APP, format: BACKUP_FORMAT, schemaVersion: schemaVersion(db), exportedAt: now.toISOString(), tables };
}

export class BackupError extends Error {}

/** Checks a parsed file before anything is deleted. Returns the row count. */
export function validateBackup(data: unknown): { backup: Backup; rows: number } {
  const backup = data as Partial<Backup> | null;
  if (!backup || backup.app !== APP || typeof backup.tables !== 'object' || backup.tables == null) {
    throw new BackupError('This file is not a Nawaru backup.');
  }
  if (backup.format !== BACKUP_FORMAT) {
    throw new BackupError('This backup uses a format this version of the app cannot read.');
  }
  if ((backup.schemaVersion ?? 0) > schemaVersion(db)) {
    throw new BackupError('This backup comes from a newer version of the app. Update the app first.');
  }
  const known = new Set(tableNames(db));
  let rows = 0;
  for (const [name, tableRows] of Object.entries(backup.tables)) {
    if (!known.has(name)) throw new BackupError(`Unknown table in backup: ${name}.`);
    if (!Array.isArray(tableRows)) throw new BackupError(`Invalid rows for ${name}.`);
    const columns = new Set(columnsOf(db, name));
    for (const row of tableRows) {
      for (const column of Object.keys(row as Row)) {
        if (!columns.has(column)) throw new BackupError(`Unknown column ${name}.${column} in backup.`);
      }
    }
    rows += tableRows.length;
  }
  return { backup: backup as Backup, rows };
}

/**
 * Replaces every table with the backup's rows, in one transaction: on any
 * error nothing changes. Foreign keys are checked at commit, so the insert
 * order does not matter.
 */
export function importBackup(data: unknown): void {
  const { backup } = validateBackup(data);
  db.transaction((tx) => {
    tx.run(sql`PRAGMA defer_foreign_keys = ON`);
    for (const name of tableNames(tx)) tx.run(sql`delete from ${sql.identifier(name)}`);
    tx.run(sql`delete from active_timer`);
    for (const [name, rows] of Object.entries(backup.tables)) {
      for (const row of rows) {
        const columns = Object.keys(row);
        if (columns.length === 0) continue;
        tx.run(
          sql`insert into ${sql.identifier(name)} (${sql.join(
            columns.map((column) => sql.identifier(column)),
            sql`, `,
          )}) values (${sql.join(
            columns.map((column) => sql`${row[column] as string | number | null}`),
            sql`, `,
          )})`,
        );
      }
    }
  });
}
