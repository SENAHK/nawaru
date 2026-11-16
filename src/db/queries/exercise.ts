import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm';

import { db, schema } from '../client';

const { equipment, exercise, exerciseEquipment, exerciseLog, exerciseMeasure, exerciseMuscle } =
  schema;
const { muscle, reference, setLog, workout } = schema;

export const exerciseByIdQuery = (exerciseId: string) =>
  db.select().from(exercise).where(eq(exercise.id, exerciseId)).limit(1);

export const exerciseMusclesQuery = (exerciseId: string) =>
  db
    .select({ id: muscle.id, name: muscle.name, role: exerciseMuscle.role })
    .from(exerciseMuscle)
    .innerJoin(muscle, eq(muscle.id, exerciseMuscle.muscleId))
    .where(eq(exerciseMuscle.exerciseId, exerciseId))
    .orderBy(asc(muscle.name));

export const exerciseEquipmentQuery = (exerciseId: string) =>
  db
    .select({ id: equipment.id, name: equipment.name })
    .from(exerciseEquipment)
    .innerJoin(equipment, eq(equipment.id, exerciseEquipment.equipmentId))
    .where(eq(exerciseEquipment.exerciseId, exerciseId))
    .orderBy(asc(equipment.name));

export const exerciseMeasuresQuery = (exerciseId: string) =>
  db
    .select({ measure: exerciseMeasure.measure })
    .from(exerciseMeasure)
    .where(eq(exerciseMeasure.exerciseId, exerciseId));

/** Most recent logs of an exercise, with their set count and heaviest load. */
export const exerciseHistoryQuery = (exerciseId: string, limit: number) =>
  db
    .select({
      id: exerciseLog.id,
      performedOn: workout.performedOn,
      setCount: sql<number>`count(${setLog.id})`,
      maxLoadKg: sql<number | null>`max(${setLog.loadKg})`,
    })
    .from(exerciseLog)
    .innerJoin(workout, eq(workout.id, exerciseLog.workoutId))
    .leftJoin(setLog, and(eq(setLog.exerciseLogId, exerciseLog.id), isNull(setLog.deletedAt)))
    .where(and(eq(exerciseLog.exerciseId, exerciseId), isNull(exerciseLog.deletedAt)))
    .groupBy(exerciseLog.id)
    .orderBy(desc(workout.performedOn))
    .limit(limit);

export const exerciseReferencesQuery = (exerciseId: string) =>
  db
    .select()
    .from(reference)
    .where(and(eq(reference.exerciseId, exerciseId), isNull(reference.deletedAt)))
    .orderBy(desc(reference.measuredOn))
    .limit(5);
