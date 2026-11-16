// Applies the generated migrations to an in-memory SQLite database and loads
// the seed into it, with foreign keys and CHECK constraints enforced.
// Run with: npm run check:seed

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { drizzle } from 'drizzle-orm/sqlite-proxy';

import { seedOrder, seedTables } from '../src/db/seed';
import { buildSeed } from '../src/db/seed/build';

const migrationsDir = join(__dirname, '..', 'drizzle');
const sqlite = new DatabaseSync(':memory:');
sqlite.exec('PRAGMA foreign_keys = ON;');

for (const file of readdirSync(migrationsDir).filter((name) => name.endsWith('.sql')).sort()) {
  for (const statement of readFileSync(join(migrationsDir, file), 'utf8').split('--> statement-breakpoint')) {
    if (statement.trim()) sqlite.exec(statement);
  }
}

// The proxy driver is only used to turn Drizzle inserts into SQL.
const builder = drizzle(async () => ({ rows: [] }));
const rows = buildSeed();

for (const table of seedOrder) {
  const { sql, params } = builder
    .insert(seedTables[table])
    .values(rows[table] as never)
    .toSQL();
  sqlite.prepare(sql).run(...(params as (string | number | null)[]));
}

const violations = sqlite.prepare('PRAGMA foreign_key_check').all();
if (violations.length > 0) {
  console.error(violations);
  throw new Error('Seed violates foreign keys');
}

for (const table of seedOrder) {
  console.log(`${table.padEnd(18)} ${String(rows[table].length).padStart(4)} rows`);
}

const schemes = sqlite
  .prepare('SELECT dosage_scheme AS scheme, count(*) AS n FROM exercise GROUP BY dosage_scheme ORDER BY 1')
  .all();
console.log('\nExercises per dosage scheme:', schemes.map((row) => `${row.scheme}=${row.n}`).join(', '));
console.log('Seed OK');
