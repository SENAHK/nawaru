import { and, asc, eq, isNull } from 'drizzle-orm';

import type { LibraryExercise } from '@/features/library/filter';

import { db, schema } from '../client';
import { requireAthlete } from './profile';

const { equipment, exercise, exerciseEquipment, exerciseFavorite, exerciseMuscle, muscle } = schema;

/** The whole library with what the list and its filters need (docs/screens.md S11). */
export function getLibrary(): LibraryExercise[] {
  const athlete = requireAthlete();
  const exercises = db.select().from(exercise).where(isNull(exercise.deletedAt)).orderBy(asc(exercise.name)).all();
  const muscles = db
    .select({ exerciseId: exerciseMuscle.exerciseId, id: muscle.id, name: muscle.name, role: exerciseMuscle.role })
    .from(exerciseMuscle)
    .innerJoin(muscle, eq(muscle.id, exerciseMuscle.muscleId))
    .where(isNull(exerciseMuscle.deletedAt))
    .all();
  const gear = db
    .select({ exerciseId: exerciseEquipment.exerciseId, id: equipment.id, name: equipment.name })
    .from(exerciseEquipment)
    .innerJoin(equipment, eq(equipment.id, exerciseEquipment.equipmentId))
    .where(isNull(exerciseEquipment.deletedAt))
    .orderBy(asc(equipment.name))
    .all();
  const favorites = new Set(
    db
      .select({ exerciseId: exerciseFavorite.exerciseId })
      .from(exerciseFavorite)
      .where(and(eq(exerciseFavorite.userId, athlete.id), isNull(exerciseFavorite.deletedAt)))
      .all()
      .map((row) => row.exerciseId),
  );

  return exercises.map((item) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    scheme: item.dosageScheme,
    muscles: muscles
      .filter((row) => row.exerciseId === item.id)
      .map(({ id, name, role }) => ({ id, name, role })),
    equipment: gear.filter((row) => row.exerciseId === item.id).map(({ id, name }) => ({ id, name })),
    favorite: favorites.has(item.id),
  }));
}

export function isFavorite(exerciseId: string): boolean {
  const athlete = requireAthlete();
  return (
    db
      .select({ id: exerciseFavorite.id })
      .from(exerciseFavorite)
      .where(
        and(
          eq(exerciseFavorite.userId, athlete.id),
          eq(exerciseFavorite.exerciseId, exerciseId),
          isNull(exerciseFavorite.deletedAt),
        ),
      )
      .all().length > 0
  );
}

/** Stars or unstars an exercise; returns the new state. */
export function toggleFavorite(exerciseId: string): boolean {
  const athlete = requireAthlete();
  const favorite = !isFavorite(exerciseId);
  // One row per athlete and exercise (unique index): revived rather than duplicated.
  db.insert(exerciseFavorite)
    .values({ userId: athlete.id, exerciseId, deletedAt: favorite ? null : Date.now() })
    .onConflictDoUpdate({
      target: [exerciseFavorite.userId, exerciseFavorite.exerciseId],
      set: { deletedAt: favorite ? null : Date.now() },
    })
    .run();
  return favorite;
}
