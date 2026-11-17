import { and, asc, eq, inArray, isNull } from 'drizzle-orm';

import type { LogRow } from '@/features/timer/rows';
import type { TimerDosage } from '@/features/timer/types';
import { today } from '@/lib/dates';

import { db, schema } from '../client';
import type { DosageScheme } from '../enums';
import { requireAthlete } from './profile';

const { activeTimer, equipment, exercise, exerciseEquipment, exerciseLog, setLog } = schema;
const { prescription, reference, userProfile, workout } = schema;

/** Defaults for a free exercise with no history (docs/screens.md §3.3). */
const defaultDosage: Record<DosageScheme, Omit<TimerDosage, 'scheme' | 'side'>> = {
  reps: { sets: 3, reps: 8, restBetweenSetsS: 120 },
  isometric: { sets: 6, durationS: 10, restBetweenSetsS: 180 },
  intervals: { sets: 6, reps: 5, onS: 7, offS: 3, restBetweenSetsS: 180 },
  circuit: { rounds: 4, itemsPerRound: 4, restBetweenSetsS: 240 },
  slots: { sets: 10, slotDurationS: 180 },
  free_duration: { totalDurationS: 3600 },
};

/** Adds an exercise to today's free session (created if needed) and returns the log id. */
export function createFreeExerciseLog(exerciseId: string): string {
  const athlete = requireAthlete();
  const [target] = db.select().from(exercise).where(eq(exercise.id, exerciseId)).limit(1).all();
  if (!target) throw new Error(`Unknown exercise ${exerciseId}`);

  return db.transaction((tx) => {
    const date = today();
    let [freeWorkout] = tx
      .select()
      .from(workout)
      .where(
        and(
          eq(workout.athleteId, athlete.id),
          eq(workout.performedOn, date),
          isNull(workout.scheduledSessionId),
          isNull(workout.deletedAt),
        ),
      )
      .limit(1)
      .all();
    freeWorkout ??= tx
      .insert(workout)
      .values({ athleteId: athlete.id, performedOn: date })
      .returning()
      .all()[0];

    const existing = tx
      .select({ id: exerciseLog.id })
      .from(exerciseLog)
      .where(eq(exerciseLog.workoutId, freeWorkout.id))
      .all();

    const [created] = tx
      .insert(exerciseLog)
      .values({
        workoutId: freeWorkout.id,
        exerciseId,
        sort: existing.length,
        effortScale: target.defaultEffortScale,
        side: target.unilateralAllowed ? 'alternate' : 'both',
        ...defaultDosage[target.dosageScheme],
      })
      .returning({ id: exerciseLog.id })
      .all();
    return created.id;
  });
}

export type LogSessionData = {
  exerciseLogId: string;
  exerciseName: string;
  /** Effort label: "HANG" on a hangboard, "GO" elsewhere. */
  usesHangboard: boolean;
  dosage: TimerDosage;
  targetLoadKg: number | null;
  savedSets: (typeof setLog.$inferSelect)[];
  settings: {
    prepCountdownS: number;
    sideSwitchRestS: number;
    soundsEnabled: boolean;
    volume: number;
    hapticsEnabled: boolean;
  };
};

/** Everything the timer + log screen needs for one exercise log. */
export function loadLogSession(exerciseLogId: string): LogSessionData | null {
  const [row] = db
    .select({ log: exerciseLog, exercise })
    .from(exerciseLog)
    .innerJoin(exercise, eq(exercise.id, exerciseLog.exerciseId))
    .where(eq(exerciseLog.id, exerciseLogId))
    .limit(1)
    .all();
  if (!row) return null;

  const gear = db
    .select({ slug: equipment.slug })
    .from(exerciseEquipment)
    .innerJoin(equipment, eq(equipment.id, exerciseEquipment.equipmentId))
    .where(eq(exerciseEquipment.exerciseId, row.exercise.id))
    .all();

  const savedSets = db
    .select()
    .from(setLog)
    .where(and(eq(setLog.exerciseLogId, exerciseLogId), isNull(setLog.deletedAt)))
    .orderBy(asc(setLog.setIndex), asc(setLog.itemIndex))
    .all();

  const athlete = requireAthlete();
  const { log } = row;

  return {
    exerciseLogId,
    exerciseName: row.exercise.name,
    usesHangboard: gear.some((item) => item.slug === 'hangboard'),
    dosage: {
      scheme: row.exercise.dosageScheme,
      side: log.side,
      sets: log.sets,
      reps: log.reps,
      durationS: log.durationS,
      onS: log.onS,
      offS: log.offS,
      restBetweenSetsS: log.restBetweenSetsS,
      rounds: log.rounds,
      itemsPerRound: log.itemsPerRound,
      slotDurationS: log.slotDurationS,
      totalDurationS: log.totalDurationS,
    },
    targetLoadKg: log.targetLoadKg,
    savedSets,
    settings: {
      prepCountdownS: athlete.prepCountdownS,
      sideSwitchRestS: athlete.sideSwitchRestS,
      soundsEnabled: athlete.timerSoundsEnabled,
      volume: athlete.timerVolume,
      hapticsEnabled: athlete.hapticsEnabled,
    },
  };
}

/** Replaces the saved sets of an exercise log with the rows on screen. */
export function saveLogRows(exerciseLogId: string, rows: LogRow[]): void {
  const now = Date.now();
  db.transaction((tx) => {
    tx.update(setLog)
      .set({ deletedAt: now })
      .where(and(eq(setLog.exerciseLogId, exerciseLogId), isNull(setLog.deletedAt)))
      .run();
    if (rows.length > 0) {
      tx.insert(setLog)
        .values(
          rows.map((row) => ({
            exerciseLogId,
            setIndex: row.setIndex,
            roundIndex: row.itemIndex == null ? null : row.setIndex,
            itemIndex: row.itemIndex,
            side: row.side,
            repsDone: row.reps,
            durationS: row.durationS,
            loadKg: row.loadKg,
            result: row.result,
          })),
        )
        .run();
    }
    createReferenceFromTest(tx, exerciseLogId, rows);
    tx.delete(activeTimer).run();
  });
}

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * A test prescription turns its best successful set into a reference, used by
 * every later prescription given in % (docs/specs.md §4, test phases).
 */
function createReferenceFromTest(tx: Transaction, exerciseLogId: string, rows: LogRow[]): void {
  const [row] = tx
    .select({ log: exerciseLog, athleteId: workout.athleteId, performedOn: workout.performedOn, isTest: prescription.isTest })
    .from(exerciseLog)
    .innerJoin(workout, eq(workout.id, exerciseLog.workoutId))
    .leftJoin(prescription, eq(prescription.id, exerciseLog.prescriptionId))
    .where(eq(exerciseLog.id, exerciseLogId))
    .limit(1)
    .all();
  if (!row?.isTest) return;

  // Re-saving the same test replaces the reference it produced.
  const previous = tx
    .select({ id: setLog.id })
    .from(setLog)
    .where(eq(setLog.exerciseLogId, exerciseLogId))
    .all()
    .map((set) => set.id);
  if (previous.length > 0) {
    tx.update(reference)
      .set({ deletedAt: Date.now() })
      .where(and(inArray(reference.sourceSetLogId, previous), isNull(reference.deletedAt)))
      .run();
  }

  const best = rows
    .filter((set) => set.result === 'success' && set.loadKg != null)
    .sort((a, b) => (b.loadKg ?? 0) - (a.loadKg ?? 0))[0];
  if (!best || best.loadKg == null) return;

  const [source] = tx
    .select({ id: setLog.id })
    .from(setLog)
    .where(
      and(
        eq(setLog.exerciseLogId, exerciseLogId),
        isNull(setLog.deletedAt),
        eq(setLog.setIndex, best.setIndex),
      ),
    )
    .limit(1)
    .all();

  tx.insert(reference)
    .values({
      athleteId: row.athleteId,
      exerciseId: row.log.exerciseId,
      gripType: row.log.gripType,
      fingerCount: row.log.fingerCount,
      side: row.log.side,
      edgeMm: row.log.edgeMm,
      durationS: row.log.durationS,
      valueKg: best.loadKg,
      measuredOn: row.performedOn,
      sourceSetLogId: source?.id ?? null,
    })
    .run();
}

export function setTimerSoundsEnabled(enabled: boolean): void {
  const athlete = requireAthlete();
  db.update(userProfile).set({ timerSoundsEnabled: enabled }).where(eq(userProfile.id, athlete.id)).run();
}

const ACTIVE_TIMER_ID = 1;

export function writeActiveTimer(exerciseLogId: string, stateJson: string): void {
  const values = { exerciseLogId, stateJson, updatedAt: Date.now() };
  db.insert(activeTimer)
    .values({ id: ACTIVE_TIMER_ID, ...values })
    .onConflictDoUpdate({ target: activeTimer.id, set: values })
    .run();
}

export function readActiveTimer() {
  return db.select().from(activeTimer).limit(1).all()[0] ?? null;
}

export function clearActiveTimer(): void {
  db.delete(activeTimer).run();
}
