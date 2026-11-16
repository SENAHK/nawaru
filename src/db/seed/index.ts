import { count } from 'drizzle-orm';

import type { Database } from '../client';
import {
  equipment,
  exercise,
  exerciseEquipment,
  exerciseMeasure,
  exerciseMuscle,
  muscle,
  plannedSession,
  prescription,
  program,
  programPhase,
  userProfile,
} from '../schema';
import { buildSeed, type SeedRows } from './build';

/** Seeded tables, in an insert order that respects foreign keys. */
export const seedTables = {
  muscle,
  equipment,
  exercise,
  exerciseMuscle,
  exerciseEquipment,
  exerciseMeasure,
  userProfile,
  program,
  programPhase,
  plannedSession,
  prescription,
} as const satisfies Record<keyof SeedRows, unknown>;

export const seedOrder = Object.keys(seedTables) as (keyof SeedRows)[];

/** Seeds the library, dummy coach and demo program on first launch only. */
export function seedDatabase(db: Database): void {
  const [{ value: exerciseCount }] = db.select({ value: count() }).from(exercise).all();
  if (exerciseCount > 0) return;

  const rows = buildSeed();
  db.transaction((tx) => {
    for (const table of seedOrder) {
      // Each key of SeedRows holds rows typed for the table of the same name.
      tx.insert(seedTables[table])
        .values(rows[table] as never)
        .run();
    }
  });
}
