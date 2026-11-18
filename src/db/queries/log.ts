import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm';

import type { LogRow } from '@/features/timer/rows';
import type { TimerDosage } from '@/features/timer/types';
import { today } from '@/lib/dates';
import { fullDosageSummary } from '@/lib/dosage-summary';
import { formatAddedLoad } from '@/lib/format';

import { db, schema } from '../client';
import type { DosageScheme, EffortScale, FingerCount, GripType, Measure } from '../enums';
import { requireAthlete } from './profile';
import { ensureWorkout, lastLoadKg } from './schedule';

const { activeTimer, equipment, exercise, exerciseEquipment, exerciseLog, exerciseMeasure, setLog } = schema;
const { prescription, reference, userProfile, workout } = schema;

export type DosageValues = Omit<TimerDosage, 'scheme' | 'side'>;

/** Defaults for a free exercise with no history (docs/screens.md §3.3). */
export const defaultDosage: Record<DosageScheme, DosageValues> = {
  reps: { sets: 3, reps: 8, restBetweenSetsS: 120 },
  isometric: { sets: 6, durationS: 10, restBetweenSetsS: 180 },
  intervals: { sets: 6, reps: 5, onS: 7, offS: 3, restBetweenSetsS: 180 },
  circuit: { rounds: 4, itemsPerRound: 4, restBetweenSetsS: 240 },
  slots: { sets: 10, slotDurationS: 180 },
  free_duration: { totalDurationS: 3600 },
};

const dosageColumns = (values: DosageValues) => ({
  sets: values.sets ?? null,
  reps: values.reps ?? null,
  durationS: values.durationS ?? null,
  onS: values.onS ?? null,
  offS: values.offS ?? null,
  restBetweenSetsS: values.restBetweenSetsS ?? null,
  rounds: values.rounds ?? null,
  itemsPerRound: values.itemsPerRound ?? null,
  slotDurationS: values.slotDurationS ?? null,
  totalDurationS: values.totalDurationS ?? null,
});

export type AddExerciseDraft = {
  exerciseId: string;
  name: string;
  scheme: DosageScheme;
  measures: Measure[];
  dosage: DosageValues;
  targetLoadKg: number | null;
  /** Where the values come from, shown under the form. */
  source: 'last' | 'default';
};

/** Quick dosage for S6: the last time this exercise was done, else the defaults. */
export function getAddExerciseDraft(exerciseId: string): AddExerciseDraft | null {
  const athlete = requireAthlete();
  const [target] = db.select().from(exercise).where(eq(exercise.id, exerciseId)).limit(1).all();
  if (!target) return null;
  const measures = db
    .select({ measure: exerciseMeasure.measure })
    .from(exerciseMeasure)
    .where(eq(exerciseMeasure.exerciseId, exerciseId))
    .all()
    .map((row) => row.measure);

  const [last] = db
    .select({ log: exerciseLog })
    .from(exerciseLog)
    .innerJoin(workout, eq(workout.id, exerciseLog.workoutId))
    .where(
      and(
        eq(workout.athleteId, athlete.id),
        isNull(workout.deletedAt),
        isNull(exerciseLog.deletedAt),
        eq(exerciseLog.exerciseId, exerciseId),
      ),
    )
    .orderBy(desc(workout.performedOn), desc(exerciseLog.updatedAt))
    .limit(1)
    .all();

  const base = {
    exerciseId,
    name: target.name,
    scheme: target.dosageScheme,
    measures,
  };
  if (!last) {
    return { ...base, dosage: defaultDosage[target.dosageScheme], targetLoadKg: null, source: 'default' };
  }
  const { log } = last;
  return {
    ...base,
    dosage: dosageColumns(log),
    targetLoadKg: lastLoadKg(db, athlete.id, log) ?? log.targetLoadKg,
    source: 'last',
  };
}

/** Where a free exercise goes: a given workout, a scheduled session, or today's free session. */
export type AddTarget = { workoutId: string } | { scheduledSessionId: string } | null;

/** Adds a free exercise (no prescription) to a workout and returns the new log id. */
export function addFreeExercise(
  target: AddTarget,
  values: { exerciseId: string; dosage: DosageValues; targetLoadKg: number | null },
): string {
  const athlete = requireAthlete();
  const [found] = db.select().from(exercise).where(eq(exercise.id, values.exerciseId)).limit(1).all();
  if (!found) throw new Error(`Unknown exercise ${values.exerciseId}`);
  const workoutId =
    target && 'scheduledSessionId' in target ? ensureWorkout(target.scheduledSessionId, false) : null;

  return db.transaction((tx) => {
    let id = target && 'workoutId' in target ? target.workoutId : workoutId;
    if (!id) {
      const date = today();
      const [free] = tx
        .select({ id: workout.id })
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
      id =
        free?.id ??
        tx.insert(workout).values({ athleteId: athlete.id, performedOn: date }).returning().all()[0].id;
    }

    const existing = tx
      .select({ id: exerciseLog.id })
      .from(exerciseLog)
      .where(eq(exerciseLog.workoutId, id))
      .all();

    const [created] = tx
      .insert(exerciseLog)
      .values({
        workoutId: id,
        exerciseId: values.exerciseId,
        sort: existing.length,
        effortScale: found.defaultEffortScale,
        side: found.unilateralAllowed ? 'alternate' : 'both',
        targetLoadKg: values.targetLoadKg,
        ...dosageColumns(values.dosage),
      })
      .returning({ id: exerciseLog.id })
      .all();
    return created.id;
  });
}

/** Exercise-level values of a log: what was actually used, effort and notes. */
export type LogDetails = {
  gripType: GripType | null;
  fingerCount: FingerCount | null;
  edgeMm: number | null;
  effortScale: EffortScale;
  effortValue: number | null;
  notes: string;
};

export type LogSessionData = {
  exerciseLogId: string;
  exerciseId: string;
  exerciseName: string;
  /** Effort label: "HANG" on a hangboard, "GO" elsewhere. */
  usesHangboard: boolean;
  measures: Measure[];
  /** "Prescribed: 7s:3s × 5 × 6 · +5 kg", or null for a free exercise. */
  prescribed: string | null;
  isTest: boolean;
  gradeSystem: 'font' | 'v_scale';
  dosage: TimerDosage;
  targetLoadKg: number | null;
  details: LogDetails;
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
    .select({ log: exerciseLog, exercise, isTest: prescription.isTest })
    .from(exerciseLog)
    .innerJoin(exercise, eq(exercise.id, exerciseLog.exerciseId))
    .leftJoin(prescription, eq(prescription.id, exerciseLog.prescriptionId))
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

  const measures = db
    .select({ measure: exerciseMeasure.measure })
    .from(exerciseMeasure)
    .where(eq(exerciseMeasure.exerciseId, row.exercise.id))
    .all()
    .map((item) => item.measure);

  const savedSets = db
    .select()
    .from(setLog)
    .where(and(eq(setLog.exerciseLogId, exerciseLogId), isNull(setLog.deletedAt)))
    .orderBy(asc(setLog.setIndex), asc(setLog.itemIndex))
    .all();

  const athlete = requireAthlete();
  const { log } = row;
  const dosage: TimerDosage = { scheme: row.exercise.dosageScheme, side: log.side, ...dosageColumns(log) };

  return {
    exerciseLogId,
    exerciseId: row.exercise.id,
    exerciseName: row.exercise.name,
    usesHangboard: gear.some((item) => item.slug === 'hangboard'),
    measures,
    prescribed: log.prescriptionId
      ? `Prescribed: ${[fullDosageSummary(dosage, log), log.targetLoadKg != null ? formatAddedLoad(log.targetLoadKg) : null]
          .filter(Boolean)
          .join(' · ')}`
      : null,
    isTest: row.isTest ?? false,
    gradeSystem: athlete.boulderGradeSystem,
    dosage,
    targetLoadKg: log.targetLoadKg,
    details: {
      gripType: log.gripType,
      fingerCount: log.fingerCount,
      edgeMm: log.edgeMm,
      effortScale: log.effortScale ?? row.exercise.defaultEffortScale,
      effortValue: log.effortValue,
      notes: log.notes,
    },
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

export type SavedReference = typeof reference.$inferSelect;

/**
 * Writes the log: exercise-level details and the sets on screen (replacing
 * the saved ones). Returns the reference created when the log is a test.
 */
export function saveLog(
  exerciseLogId: string,
  rows: LogRow[],
  details: LogDetails,
  gradeSystem: string,
): SavedReference | null {
  const now = Date.now();
  return db.transaction((tx) => {
    tx.update(exerciseLog)
      .set({ ...details, notes: details.notes.trim() })
      .where(eq(exerciseLog.id, exerciseLogId))
      .run();
    const previous = tx
      .select({ id: setLog.id })
      .from(setLog)
      .where(and(eq(setLog.exerciseLogId, exerciseLogId), isNull(setLog.deletedAt)))
      .all()
      .map((set) => set.id);
    if (previous.length > 0) {
      tx.update(setLog).set({ deletedAt: now }).where(inArray(setLog.id, previous)).run();
    }
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
            grade: row.grade,
            gradeSystem: row.grade ? gradeSystem : null,
            result: row.result,
          })),
        )
        .run();
    }
    const created = createReferenceFromTest(tx, exerciseLogId, rows, previous);
    tx.delete(activeTimer).run();
    return created;
  });
}

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * A test prescription turns its best successful set into a reference, used by
 * every later prescription given in % (docs/specs.md §4, test phases).
 */
function createReferenceFromTest(
  tx: Transaction,
  exerciseLogId: string,
  rows: LogRow[],
  previousSetIds: string[],
): SavedReference | null {
  const [row] = tx
    .select({ log: exerciseLog, athleteId: workout.athleteId, performedOn: workout.performedOn, isTest: prescription.isTest })
    .from(exerciseLog)
    .innerJoin(workout, eq(workout.id, exerciseLog.workoutId))
    .leftJoin(prescription, eq(prescription.id, exerciseLog.prescriptionId))
    .where(eq(exerciseLog.id, exerciseLogId))
    .limit(1)
    .all();
  if (!row?.isTest) return null;

  // Re-saving the same test replaces the reference it produced.
  if (previousSetIds.length > 0) {
    tx.update(reference)
      .set({ deletedAt: Date.now() })
      .where(and(inArray(reference.sourceSetLogId, previousSetIds), isNull(reference.deletedAt)))
      .run();
  }

  const best = rows
    .filter((set) => set.result === 'success' && set.loadKg != null)
    .sort((a, b) => (b.loadKg ?? 0) - (a.loadKg ?? 0))[0];
  if (!best || best.loadKg == null) return null;

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

  const [created] = tx
    .insert(reference)
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
    .returning()
    .all();
  return created;
}

/** Grip combinations used recently, newest first, for the grip picker shortcuts. */
export function recentGrips(limit = 4): { gripType: GripType; fingerCount: FingerCount }[] {
  const athlete = requireAthlete();
  const rows = db
    .select({ gripType: exerciseLog.gripType, fingerCount: exerciseLog.fingerCount })
    .from(exerciseLog)
    .innerJoin(workout, eq(workout.id, exerciseLog.workoutId))
    .where(and(eq(workout.athleteId, athlete.id), isNull(exerciseLog.deletedAt), isNull(workout.deletedAt)))
    .orderBy(desc(exerciseLog.updatedAt))
    .limit(50)
    .all();
  const seen = new Set<string>();
  const grips: { gripType: GripType; fingerCount: FingerCount }[] = [];
  for (const { gripType, fingerCount } of rows) {
    if (!gripType || !fingerCount) continue;
    const key = `${gripType}:${fingerCount}`;
    if (seen.has(key)) continue;
    seen.add(key);
    grips.push({ gripType, fingerCount });
    if (grips.length === limit) break;
  }
  return grips;
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
