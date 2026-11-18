import { and, asc, desc, eq, gte, inArray, isNull, lte, sql } from 'drizzle-orm';

import {
  programWeekOf,
  resolveLoad,
  sessionStatus,
  type SessionStatus,
} from '@/features/schedule/schedule';
import type { TimerDosage } from '@/features/timer/types';
import { addDays, mondayOf, today } from '@/lib/dates';
import { fullDosageSummary } from '@/lib/dosage-summary';

import { db, schema } from '../client';
import type { Category, FingerCount, GripType, Side } from '../enums';
import { requireAthlete } from './profile';

const { enrollment, exercise, exerciseLog, plannedSession, prescription, program } = schema;
const { reference, scheduledSession, setLog, userProfile, workout } = schema;

type Reader = Pick<typeof db, 'select'>;

export type SessionItem = {
  key: string;
  /** Set once the workout exists. */
  exerciseLogId: string | null;
  exerciseId: string;
  name: string;
  category: Category;
  summary: string;
  loadLabel: string;
  note: string;
  isTest: boolean;
  state: 'todo' | 'done' | 'partial';
};

export type SessionSummary = {
  scheduledSessionId: string | null;
  workoutId: string | null;
  title: string;
  isTest: boolean;
  scheduledDate: string;
  performedOn: string | null;
  status: SessionStatus;
  program: { id: string; name: string; color: string | null; author: string; week: number; day: number } | null;
  items: SessionItem[];
};

type GripKey = {
  gripType: GripType | null;
  fingerCount: FingerCount | null;
  side: Side | null;
  edgeMm: number | null;
  durationS: number | null;
};

/** Latest test result matching a grip / edge / duration combination, whatever the program. */
export function latestReferenceKg(reader: Reader, athleteId: string, key: GripKey): number | null {
  const same = <T>(column: Parameters<typeof eq>[0], value: T | null) =>
    value == null ? isNull(column) : eq(column, value);
  const [row] = reader
    .select({ valueKg: reference.valueKg })
    .from(reference)
    .where(
      and(
        eq(reference.athleteId, athleteId),
        isNull(reference.deletedAt),
        same(reference.gripType, key.gripType),
        same(reference.fingerCount, key.fingerCount),
        same(reference.edgeMm, key.edgeMm),
        same(reference.durationS, key.durationS),
      ),
    )
    .orderBy(desc(reference.measuredOn), desc(reference.createdAt))
    .limit(1)
    .all();
  return row?.valueKg ?? null;
}

/**
 * Best successful load of the last log of an exercise done with the same grip
 * and edge (docs/data-model.md §9, pre-filling the log).
 */
export function lastLoadKg(
  reader: Reader,
  athleteId: string,
  key: { exerciseId: string; gripType: GripType | null; fingerCount: FingerCount | null; edgeMm: number | null },
  excludeLogId?: string,
): number | null {
  const same = <T>(column: Parameters<typeof eq>[0], value: T | null) =>
    value == null ? isNull(column) : eq(column, value);
  const logs = reader
    .select({ id: exerciseLog.id })
    .from(exerciseLog)
    .innerJoin(workout, eq(workout.id, exerciseLog.workoutId))
    .where(
      and(
        eq(workout.athleteId, athleteId),
        isNull(workout.deletedAt),
        isNull(exerciseLog.deletedAt),
        eq(exerciseLog.exerciseId, key.exerciseId),
        same(exerciseLog.gripType, key.gripType),
        same(exerciseLog.fingerCount, key.fingerCount),
        same(exerciseLog.edgeMm, key.edgeMm),
      ),
    )
    .orderBy(desc(workout.performedOn), desc(exerciseLog.updatedAt))
    .limit(5)
    .all();

  for (const log of logs) {
    if (log.id === excludeLogId) continue;
    const [best] = reader
      .select({ loadKg: sql<number | null>`max(${setLog.loadKg})` })
      .from(setLog)
      .where(and(eq(setLog.exerciseLogId, log.id), isNull(setLog.deletedAt), eq(setLog.result, 'success')))
      .all();
    if (best?.loadKg != null) return best.loadKg;
  }
  return null;
}

const dosageOf = (
  scheme: TimerDosage['scheme'],
  row: Omit<TimerDosage, 'scheme' | 'side'> & { side: Side | null },
): TimerDosage => ({
  scheme,
  side: row.side,
  sets: row.sets,
  reps: row.reps,
  durationS: row.durationS,
  onS: row.onS,
  offS: row.offS,
  restBetweenSetsS: row.restBetweenSetsS,
  rounds: row.rounds,
  itemsPerRound: row.itemsPerRound,
  slotDurationS: row.slotDurationS,
  totalDurationS: row.totalDurationS,
});

/** Items of a session that has no workout yet: straight from the prescriptions. */
function plannedItems(athleteId: string, plannedSessionIds: string[]): Map<string, SessionItem[]> {
  const items = new Map<string, SessionItem[]>();
  if (plannedSessionIds.length === 0) return items;
  const rows = db
    .select({ rx: prescription, exercise })
    .from(prescription)
    .innerJoin(exercise, eq(exercise.id, prescription.exerciseId))
    .where(and(inArray(prescription.plannedSessionId, plannedSessionIds), isNull(prescription.deletedAt)))
    .orderBy(asc(prescription.sort))
    .all();

  for (const { rx, exercise: target } of rows) {
    const referenceKg =
      rx.loadMode === 'percent_reference' ? latestReferenceKg(db, athleteId, rx) : null;
    const lastKg = rx.loadMode === 'none' ? lastLoadKg(db, athleteId, rx) : null;
    const item: SessionItem = {
      key: rx.id,
      exerciseLogId: null,
      exerciseId: target.id,
      name: target.name,
      category: target.category,
      summary: fullDosageSummary(dosageOf(target.dosageScheme, rx), rx),
      loadLabel: resolveLoad(rx.loadMode, rx.loadValue, referenceKg, lastKg).label,
      note: rx.notes,
      isTest: rx.isTest,
      state: 'todo',
    };
    items.set(rx.plannedSessionId, [...(items.get(rx.plannedSessionId) ?? []), item]);
  }
  return items;
}

/** Items of an existing workout: its exercise logs, with what was done. */
function workoutItems(workoutIds: string[]): Map<string, SessionItem[]> {
  const items = new Map<string, SessionItem[]>();
  if (workoutIds.length === 0) return items;
  const rows = db
    .select({
      log: exerciseLog,
      exercise,
      note: prescription.notes,
      isTest: prescription.isTest,
      loadMode: prescription.loadMode,
      loadValue: prescription.loadValue,
      sets: sql<number>`count(${setLog.id})`,
      fails: sql<number>`coalesce(sum(${setLog.result} = 'fail'), 0)`,
    })
    .from(exerciseLog)
    .innerJoin(exercise, eq(exercise.id, exerciseLog.exerciseId))
    .leftJoin(prescription, eq(prescription.id, exerciseLog.prescriptionId))
    .leftJoin(setLog, and(eq(setLog.exerciseLogId, exerciseLog.id), isNull(setLog.deletedAt)))
    .where(and(inArray(exerciseLog.workoutId, workoutIds), isNull(exerciseLog.deletedAt)))
    .groupBy(exerciseLog.id)
    .orderBy(asc(exerciseLog.sort))
    .all();

  for (const row of rows) {
    const { log } = row;
    const percent = row.loadMode === 'percent_reference' && row.loadValue != null;
    const load = resolveLoad(log.targetLoadKg == null ? 'none' : 'added', log.targetLoadKg, null, null);
    const item: SessionItem = {
      key: log.id,
      exerciseLogId: log.id,
      exerciseId: row.exercise.id,
      name: row.exercise.name,
      category: row.exercise.category,
      summary: fullDosageSummary(dosageOf(row.exercise.dosageScheme, log), log),
      loadLabel:
        percent && log.targetLoadKg != null
          ? `${load.label} (${row.loadValue}% ref)`
          : percent
            ? `${row.loadValue}% ref · no test yet`
            : load.label,
      note: row.note ?? '',
      isTest: row.isTest ?? false,
      state: row.sets === 0 ? 'todo' : row.fails > 0 ? 'partial' : 'done',
    };
    items.set(log.workoutId, [...(items.get(log.workoutId) ?? []), item]);
  }
  return items;
}

type Filter = { from: string; to: string } | { scheduledSessionId: string };

/** Scheduled sessions of the athlete's enrollments, with their status and exercises. */
export function getScheduledSessions(filter: Filter): SessionSummary[] {
  const athlete = requireAthlete();
  const now = today();
  const range =
    'from' in filter
      ? and(gte(scheduledSession.scheduledDate, filter.from), lte(scheduledSession.scheduledDate, filter.to))
      : eq(scheduledSession.id, filter.scheduledSessionId);

  const rows = db
    .select({
      scheduled: scheduledSession,
      planned: plannedSession,
      enrollment,
      program: { id: program.id, name: program.name, ownerId: program.ownerId },
      author: userProfile.displayName,
      workout,
    })
    .from(scheduledSession)
    .innerJoin(enrollment, eq(enrollment.id, scheduledSession.enrollmentId))
    .innerJoin(plannedSession, eq(plannedSession.id, scheduledSession.plannedSessionId))
    .innerJoin(program, eq(program.id, enrollment.programId))
    .innerJoin(userProfile, eq(userProfile.id, program.ownerId))
    .leftJoin(workout, and(eq(workout.scheduledSessionId, scheduledSession.id), isNull(workout.deletedAt)))
    .where(and(eq(enrollment.athleteId, athlete.id), isNull(scheduledSession.deletedAt), range))
    .orderBy(asc(scheduledSession.scheduledDate), asc(program.name), asc(plannedSession.sort))
    .all()
    // A paused enrollment hides its unlogged sessions from the pause date on.
    .filter(
      (row) =>
        row.enrollment.status === 'active' ||
        row.workout != null ||
        (row.enrollment.status === 'paused' &&
          row.enrollment.pausedAt != null &&
          row.scheduled.scheduledDate < row.enrollment.pausedAt),
    );

  const planned = plannedItems(
    athlete.id,
    rows.filter((row) => !row.workout).map((row) => row.planned.id),
  );
  const logged = workoutItems(rows.flatMap((row) => (row.workout ? [row.workout.id] : [])));

  return rows.map((row) => {
    const items = row.workout
      ? (logged.get(row.workout.id) ?? [])
      : (planned.get(row.planned.id) ?? []);
    return {
      scheduledSessionId: row.scheduled.id,
      workoutId: row.workout?.id ?? null,
      title: row.planned.name ?? 'Session',
      isTest: row.planned.isTest,
      scheduledDate: row.scheduled.scheduledDate,
      performedOn: row.workout?.performedOn ?? null,
      status: sessionStatus(
        row.scheduled.scheduledDate,
        now,
        row.workout && {
          startedAt: row.workout.startedAt,
          endedAt: row.workout.endedAt,
          loggedExercises: items.filter((item) => item.state !== 'todo').length,
        },
      ),
      program: {
        id: row.program.id,
        name: row.program.name,
        color: row.enrollment.color,
        author: row.program.ownerId === athlete.id ? 'you' : row.author,
        week: programWeekOf(row.enrollment.startDate, row.scheduled.scheduledDate),
        day: row.planned.dayOfWeek,
      },
      items,
    };
  });
}

/** Free sessions (no scheduled session) in a date range, or one by id. */
export function getFreeWorkouts(filter: { from: string; to: string } | { workoutId: string }): SessionSummary[] {
  const athlete = requireAthlete();
  const now = today();
  const rows = db
    .select()
    .from(workout)
    .where(
      and(
        eq(workout.athleteId, athlete.id),
        isNull(workout.scheduledSessionId),
        isNull(workout.deletedAt),
        'from' in filter
          ? and(gte(workout.performedOn, filter.from), lte(workout.performedOn, filter.to))
          : eq(workout.id, filter.workoutId),
      ),
    )
    .all();
  const logged = workoutItems(rows.map((row) => row.id));

  return rows.map((row) => {
    const items = logged.get(row.id) ?? [];
    return {
      scheduledSessionId: null,
      workoutId: row.id,
      title: 'Free session',
      isTest: false,
      scheduledDate: row.performedOn,
      performedOn: row.performedOn,
      status: sessionStatus(row.performedOn, now, {
        startedAt: row.startedAt,
        endedAt: row.endedAt,
        loggedExercises: items.filter((item) => item.state !== 'todo').length,
      }),
      program: null,
      items,
    };
  });
}

export type TodayData = {
  sessions: SessionSummary[];
  freeSessions: SessionSummary[];
  missed: SessionSummary[];
  next: SessionSummary | null;
  hasActiveProgram: boolean;
  week: { done: number; planned: number };
  lastReference: (typeof reference.$inferSelect) | null;
};

const MISSED_WINDOW_DAYS = 7;
const NEXT_WINDOW_DAYS = 60;

export function getTodayData(date: string): TodayData {
  const athlete = requireAthlete();
  const monday = mondayOf(date);
  const weekSessions = getScheduledSessions({ from: monday, to: addDays(monday, 6) });
  const recent = getScheduledSessions({ from: addDays(date, -MISSED_WINDOW_DAYS), to: addDays(date, -1) });
  const upcoming = getScheduledSessions({ from: addDays(date, 1), to: addDays(date, NEXT_WINDOW_DAYS) });

  const [active] = db
    .select({ id: enrollment.id })
    .from(enrollment)
    .where(and(eq(enrollment.athleteId, athlete.id), inArray(enrollment.status, ['active', 'paused'])))
    .limit(1)
    .all();
  const [lastReference] = db
    .select()
    .from(reference)
    .where(and(eq(reference.athleteId, athlete.id), isNull(reference.deletedAt)))
    .orderBy(desc(reference.measuredOn), desc(reference.createdAt))
    .limit(1)
    .all();

  return {
    sessions: weekSessions.filter((session) => session.scheduledDate === date),
    freeSessions: getFreeWorkouts({ from: date, to: date }),
    missed: recent.filter((session) => session.status === 'missed').reverse(),
    next: upcoming.find((session) => session.status === 'planned') ?? null,
    hasActiveProgram: active != null,
    week: {
      done: weekSessions.filter((session) => session.status === 'done').length,
      planned: weekSessions.length,
    },
    lastReference: lastReference ?? null,
  };
}

/**
 * Makes sure a workout (with one exercise log per prescription) exists for a
 * scheduled session. `start` records the start time ("Start session").
 */
export function ensureWorkout(scheduledSessionId: string, start: boolean): string {
  const athlete = requireAthlete();
  return db.transaction((tx) => {
    const [existing] = tx
      .select()
      .from(workout)
      .where(and(eq(workout.scheduledSessionId, scheduledSessionId), isNull(workout.deletedAt)))
      .limit(1)
      .all();
    if (existing) {
      if (start && existing.startedAt == null && existing.endedAt == null) {
        tx.update(workout).set({ startedAt: Date.now() }).where(eq(workout.id, existing.id)).run();
      }
      return existing.id;
    }

    const [scheduled] = tx
      .select()
      .from(scheduledSession)
      .where(eq(scheduledSession.id, scheduledSessionId))
      .limit(1)
      .all();
    if (!scheduled) throw new Error(`Unknown scheduled session ${scheduledSessionId}`);

    const [created] = tx
      .insert(workout)
      .values({
        athleteId: athlete.id,
        scheduledSessionId,
        performedOn: today(),
        startedAt: start ? Date.now() : null,
      })
      .returning({ id: workout.id })
      .all();

    const prescriptions = tx
      .select()
      .from(prescription)
      .where(and(eq(prescription.plannedSessionId, scheduled.plannedSessionId), isNull(prescription.deletedAt)))
      .orderBy(asc(prescription.sort))
      .all();

    if (prescriptions.length > 0) {
      tx.insert(exerciseLog)
        .values(
          prescriptions.map((rx, sort) => {
            const referenceKg =
              rx.loadMode === 'percent_reference' ? latestReferenceKg(tx, athlete.id, rx) : null;
            const lastKg = rx.loadMode === 'none' ? lastLoadKg(tx, athlete.id, rx) : null;
            return {
              workoutId: created.id,
              exerciseId: rx.exerciseId,
              prescriptionId: rx.id,
              sort,
              sets: rx.sets,
              reps: rx.reps,
              durationS: rx.durationS,
              onS: rx.onS,
              offS: rx.offS,
              restBetweenSetsS: rx.restBetweenSetsS,
              rounds: rx.rounds,
              itemsPerRound: rx.itemsPerRound,
              slotDurationS: rx.slotDurationS,
              totalDurationS: rx.totalDurationS,
              targetLoadKg: resolveLoad(rx.loadMode, rx.loadValue, referenceKg, lastKg).kg,
              gripType: rx.gripType,
              fingerCount: rx.fingerCount,
              side: rx.side,
              edgeMm: rx.edgeMm,
              supportLabel: rx.supportLabel,
              effortScale: rx.effortScale,
            };
          }),
        )
        .run();
    }
    return created.id;
  });
}

export function startWorkout(workoutId: string): void {
  db.update(workout)
    .set({ startedAt: Date.now() })
    .where(and(eq(workout.id, workoutId), isNull(workout.startedAt)))
    .run();
}

export function finishWorkout(workoutId: string): void {
  const now = Date.now();
  db.update(workout)
    .set({ endedAt: now, startedAt: sql`coalesce(${workout.startedAt}, ${now})` })
    .where(eq(workout.id, workoutId))
    .run();
}

/** The exercise log created in a workout for a given prescription. */
export function findExerciseLog(workoutId: string, prescriptionId: string): string | null {
  const [row] = db
    .select({ id: exerciseLog.id })
    .from(exerciseLog)
    .where(
      and(
        eq(exerciseLog.workoutId, workoutId),
        eq(exerciseLog.prescriptionId, prescriptionId),
        isNull(exerciseLog.deletedAt),
      ),
    )
    .limit(1)
    .all();
  return row?.id ?? null;
}

/** Changes the date a workout was performed on (the session keeps its planned date). */
export function setPerformedOn(workoutId: string, date: string): void {
  db.update(workout).set({ performedOn: date }).where(eq(workout.id, workoutId)).run();
}

/**
 * "Delete log": soft-deletes the workout, its exercise logs and sets, and the
 * references they produced. The session goes back to planned or missed.
 */
export function deleteWorkout(workoutId: string): void {
  const now = Date.now();
  db.transaction((tx) => {
    const logIds = tx
      .select({ id: exerciseLog.id })
      .from(exerciseLog)
      .where(eq(exerciseLog.workoutId, workoutId))
      .all()
      .map((log) => log.id);
    if (logIds.length > 0) {
      const setIds = tx
        .select({ id: setLog.id })
        .from(setLog)
        .where(inArray(setLog.exerciseLogId, logIds))
        .all()
        .map((set) => set.id);
      if (setIds.length > 0) {
        tx.update(reference)
          .set({ deletedAt: now })
          .where(and(inArray(reference.sourceSetLogId, setIds), isNull(reference.deletedAt)))
          .run();
      }
      tx.update(setLog)
        .set({ deletedAt: now })
        .where(and(inArray(setLog.exerciseLogId, logIds), isNull(setLog.deletedAt)))
        .run();
      tx.update(exerciseLog)
        .set({ deletedAt: now })
        .where(and(eq(exerciseLog.workoutId, workoutId), isNull(exerciseLog.deletedAt)))
        .run();
    }
    // The unique link to the scheduled session is released so it can be logged again.
    tx.update(workout)
      .set({ deletedAt: now, scheduledSessionId: null })
      .where(eq(workout.id, workoutId))
      .run();
  });
}

export type ActiveWorkout = {
  workoutId: string;
  scheduledSessionId: string | null;
  title: string;
  startedAt: number;
};

/** The workout started and not finished, shown in the session bar. */
export function getActiveWorkout(): ActiveWorkout | null {
  const athlete = requireAthlete();
  const [row] = db
    .select({ workout, name: plannedSession.name })
    .from(workout)
    .leftJoin(scheduledSession, eq(scheduledSession.id, workout.scheduledSessionId))
    .leftJoin(plannedSession, eq(plannedSession.id, scheduledSession.plannedSessionId))
    .where(
      and(
        eq(workout.athleteId, athlete.id),
        isNull(workout.deletedAt),
        sql`${workout.startedAt} is not null`,
        isNull(workout.endedAt),
      ),
    )
    .orderBy(desc(workout.startedAt))
    .limit(1)
    .all();
  if (!row?.workout.startedAt) return null;
  return {
    workoutId: row.workout.id,
    scheduledSessionId: row.workout.scheduledSessionId,
    title: row.workout.scheduledSessionId ? (row.name ?? 'Session') : 'Free session',
    startedAt: row.workout.startedAt,
  };
}
