// Progress screen queries (docs/screens.md S12).

import { and, asc, desc, eq, isNotNull, isNull, sql } from 'drizzle-orm';

import {
  bestPerDay,
  comboKey,
  personalRecordId,
  type HangCombo,
  type Point,
} from '@/features/progress/stats';
import type { TimerDosage } from '@/features/timer/types';
import { addDays, mondayOf } from '@/lib/dates';
import { dosageSummary } from '@/lib/dosage-summary';

import { db, schema } from '../client';
import { requireAthlete } from './profile';
import { getScheduledSessions } from './schedule';

const { exercise, exerciseLog, reference, setLog, workout } = schema;

const same = <T>(column: Parameters<typeof eq>[0], value: T | null) =>
  value == null ? isNull(column) : eq(column, value);

/** Successful loaded sets of isometric exercises: the raw material of the max hang chart. */
function hangSets(athleteId: string) {
  return db
    .select({
      date: workout.performedOn,
      kg: setLog.loadKg,
      gripType: exerciseLog.gripType,
      fingerCount: exerciseLog.fingerCount,
      edgeMm: exerciseLog.edgeMm,
      durationS: exerciseLog.durationS,
    })
    .from(setLog)
    .innerJoin(exerciseLog, eq(exerciseLog.id, setLog.exerciseLogId))
    .innerJoin(exercise, eq(exercise.id, exerciseLog.exerciseId))
    .innerJoin(workout, eq(workout.id, exerciseLog.workoutId))
    .where(
      and(
        eq(workout.athleteId, athleteId),
        isNull(workout.deletedAt),
        isNull(exerciseLog.deletedAt),
        isNull(setLog.deletedAt),
        eq(exercise.dosageScheme, 'isometric'),
        eq(setLog.result, 'success'),
        isNotNull(setLog.loadKg),
      ),
    )
    .all();
}

export type HangOverview = {
  /** Combinations logged, most used first. */
  combos: (HangCombo & { key: string; sets: number })[];
  bodyweightKg: number | null;
};

export function getHangOverview(): HangOverview {
  const athlete = requireAthlete();
  const counts = new Map<string, HangCombo & { key: string; sets: number }>();
  for (const set of hangSets(athlete.id)) {
    const key = comboKey(set);
    const current = counts.get(key);
    if (current) current.sets += 1;
    else
      counts.set(key, {
        key,
        sets: 1,
        gripType: set.gripType,
        fingerCount: set.fingerCount,
        edgeMm: set.edgeMm,
        durationS: set.durationS,
      });
  }
  return {
    combos: [...counts.values()].sort((a, b) => b.sets - a.sets),
    bodyweightKg: athlete.bodyweightKg,
  };
}

export type HangSeries = { points: Point[]; references: Point[] };

/** Best set per day for one combination, and the test references of that combination. */
export function getHangSeries(combo: HangCombo): HangSeries {
  const athlete = requireAthlete();
  const key = comboKey(combo);
  const sets = hangSets(athlete.id)
    .filter((set) => comboKey(set) === key)
    .map((set) => ({ date: set.date, kg: set.kg ?? 0 }));

  const references = db
    .select({ date: reference.measuredOn, kg: reference.valueKg })
    .from(reference)
    .where(
      and(
        eq(reference.athleteId, athlete.id),
        isNull(reference.deletedAt),
        same(reference.gripType, combo.gripType),
        same(reference.fingerCount, combo.fingerCount),
        same(reference.edgeMm, combo.edgeMm),
        same(reference.durationS, combo.durationS),
      ),
    )
    .orderBy(asc(reference.measuredOn))
    .all();

  return { points: bestPerDay(sets), references };
}

export type HistoryEntry = {
  id: string;
  date: string;
  summary: string;
  sets: number;
  fails: number;
  bestKg: number | null;
  pr: boolean;
};

/** Every log of an exercise, newest first, with the record flagged. */
export function getExerciseHistory(exerciseId: string): HistoryEntry[] {
  const athlete = requireAthlete();
  const rows = db
    .select({
      log: exerciseLog,
      scheme: exercise.dosageScheme,
      date: workout.performedOn,
      sets: sql<number>`count(${setLog.id})`,
      fails: sql<number>`coalesce(sum(${setLog.result} = 'fail'), 0)`,
      bestKg: sql<number | null>`max(case when ${setLog.result} = 'success' then ${setLog.loadKg} end)`,
    })
    .from(exerciseLog)
    .innerJoin(exercise, eq(exercise.id, exerciseLog.exerciseId))
    .innerJoin(workout, eq(workout.id, exerciseLog.workoutId))
    .leftJoin(setLog, and(eq(setLog.exerciseLogId, exerciseLog.id), isNull(setLog.deletedAt)))
    .where(
      and(
        eq(exerciseLog.exerciseId, exerciseId),
        eq(workout.athleteId, athlete.id),
        isNull(workout.deletedAt),
        isNull(exerciseLog.deletedAt),
      ),
    )
    .groupBy(exerciseLog.id)
    .orderBy(desc(workout.performedOn), desc(exerciseLog.createdAt))
    .all()
    // Only logs with something done in them.
    .filter((row) => row.sets > 0);

  const entries = rows.map((row) => {
    const dosage: TimerDosage = { ...row.log, scheme: row.scheme };
    return {
      id: row.log.id,
      date: row.date,
      summary: dosageSummary(dosage),
      sets: row.sets,
      fails: row.fails,
      bestKg: row.bestKg,
      pr: false,
    };
  });
  const record = personalRecordId(entries);
  return entries.map((entry) => ({ ...entry, pr: entry.id === record }));
}

/** The exercise logged most recently, to show a history by default. */
export function getLastLoggedExercise(): { id: string; name: string } | null {
  const athlete = requireAthlete();
  const [row] = db
    .select({ id: exercise.id, name: exercise.name })
    .from(setLog)
    .innerJoin(exerciseLog, eq(exerciseLog.id, setLog.exerciseLogId))
    .innerJoin(exercise, eq(exercise.id, exerciseLog.exerciseId))
    .innerJoin(workout, eq(workout.id, exerciseLog.workoutId))
    .where(
      and(
        eq(workout.athleteId, athlete.id),
        isNull(workout.deletedAt),
        isNull(exerciseLog.deletedAt),
        isNull(setLog.deletedAt),
      ),
    )
    .orderBy(desc(workout.performedOn), desc(setLog.createdAt))
    .limit(1)
    .all();
  return row ?? null;
}

export function getExerciseName(exerciseId: string): string | null {
  return db.select({ name: exercise.name }).from(exercise).where(eq(exercise.id, exerciseId)).all()[0]?.name ?? null;
}

/** Scheduled sessions of the last 8 weeks, for the consistency bars. */
export function getConsistencySessions(today: string) {
  const from = addDays(mondayOf(today), -7 * 7);
  return getScheduledSessions({ from, to: addDays(mondayOf(today), 6) }).map((session) => ({
    scheduledDate: session.scheduledDate,
    status: session.status,
  }));
}
