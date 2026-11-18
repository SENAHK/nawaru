// Enrollments: enroll, shift, pause, resume, stop (docs/screens.md S7,
// docs/data-model.md §6).

import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm';

import { assertMonday, weeksPaused } from '@/features/schedule/schedule';
import { mondayOf, today } from '@/lib/dates';
import { programColors } from '@/theme/tokens';

import { db, schema } from '../client';
import type { EnrollmentStatus } from '../enums';
import { enroll, requireAthlete } from './profile';

const { enrollment, plannedSession, program, scheduledSession, userProfile, workout } = schema;

type Reader = Pick<typeof db, 'select'>;

export type EnrollmentRow = {
  enrollmentId: string;
  programId: string;
  name: string;
  author: string;
  color: string | null;
  status: EnrollmentStatus;
  pausedAt: string | null;
  startDate: string;
  /** Program week the athlete is in today (1 before the start). */
  currentWeek: number;
  totalWeeks: number;
  /** All the sessions are behind. */
  finished: boolean;
};

export type ProgramRow = {
  programId: string;
  name: string;
  author: string;
  totalWeeks: number;
};

export type ProgramsOverview = {
  active: EnrollmentRow[];
  mine: ProgramRow[];
  archived: EnrollmentRow[];
};

const weeksOf = (durationDays: number) => Math.max(1, Math.ceil(durationDays / 7));

/** Visible scheduled sessions of an enrollment, with their planned week and workout. */
function sessionsOf(reader: Reader, enrollmentId: string) {
  return reader
    .select({
      id: scheduledSession.id,
      date: scheduledSession.scheduledDate,
      week: plannedSession.weekIndex,
      workoutId: workout.id,
    })
    .from(scheduledSession)
    .innerJoin(plannedSession, eq(plannedSession.id, scheduledSession.plannedSessionId))
    .leftJoin(workout, and(eq(workout.scheduledSessionId, scheduledSession.id), isNull(workout.deletedAt)))
    .where(and(eq(scheduledSession.enrollmentId, enrollmentId), isNull(scheduledSession.deletedAt)))
    .orderBy(asc(scheduledSession.scheduledDate))
    .all();
}

/** Week of the latest session on or before `date`; 1 before the first one. */
function weekAt(sessions: { date: string; week: number }[], date: string): number {
  return sessions.filter((session) => session.date <= date).at(-1)?.week ?? 1;
}

export function getProgramsOverview(): ProgramsOverview {
  const athlete = requireAthlete();
  const now = today();

  const enrollments = db
    .select({
      enrollment,
      name: program.name,
      ownerId: program.ownerId,
      durationDays: program.durationDays,
      author: userProfile.displayName,
    })
    .from(enrollment)
    .innerJoin(program, eq(program.id, enrollment.programId))
    .innerJoin(userProfile, eq(userProfile.id, program.ownerId))
    .where(and(eq(enrollment.athleteId, athlete.id), isNull(enrollment.deletedAt), isNull(program.deletedAt)))
    .orderBy(desc(enrollment.createdAt))
    .all();

  const rows: EnrollmentRow[] = enrollments.map((row) => {
    const sessions = sessionsOf(db, row.enrollment.id);
    return {
      enrollmentId: row.enrollment.id,
      programId: row.enrollment.programId,
      name: row.name,
      author: row.ownerId === athlete.id ? 'you' : row.author,
      color: row.enrollment.color,
      status: row.enrollment.status,
      pausedAt: row.enrollment.pausedAt,
      startDate: row.enrollment.startDate,
      currentWeek: weekAt(sessions, now),
      totalWeeks: weeksOf(row.durationDays),
      finished: sessions.length > 0 && sessions.every((session) => session.date < now),
    };
  });

  const active = rows.filter((row) => row.status === 'active' || row.status === 'paused');
  const busy = new Set(active.map((row) => row.programId));
  // One archived line per program, the latest, unless it is followed again.
  const archived: EnrollmentRow[] = [];
  for (const row of rows) {
    if (row.status === 'active' || row.status === 'paused' || busy.has(row.programId)) continue;
    if (archived.some((other) => other.programId === row.programId)) continue;
    archived.push(row);
  }

  const mine = db
    .select({ id: program.id, name: program.name, durationDays: program.durationDays })
    .from(program)
    .where(and(eq(program.ownerId, athlete.id), eq(program.isTemplate, false), isNull(program.deletedAt)))
    .orderBy(asc(program.name))
    .all()
    .filter((row) => !busy.has(row.id))
    .map((row) => ({ programId: row.id, name: row.name, author: 'you', totalWeeks: weeksOf(row.durationDays) }));

  return { active, mine, archived };
}

/** First program colour not used by an active enrollment. */
export function nextProgramColor(): string {
  const athlete = requireAthlete();
  const used = new Set(
    db
      .select({ color: enrollment.color })
      .from(enrollment)
      .where(and(eq(enrollment.athleteId, athlete.id), inArray(enrollment.status, ['active', 'paused'])))
      .all()
      .map((row) => row.color),
  );
  return programColors.find((color) => !used.has(color)) ?? programColors[0];
}

export function enrollInProgram(programId: string, startDate: string, color: string): string {
  assertMonday(startDate);
  const athlete = requireAthlete();
  return db.transaction((tx) => {
    const [current] = tx
      .select({ id: enrollment.id })
      .from(enrollment)
      .where(
        and(
          eq(enrollment.athleteId, athlete.id),
          eq(enrollment.programId, programId),
          inArray(enrollment.status, ['active', 'paused']),
          isNull(enrollment.deletedAt),
        ),
      )
      .limit(1)
      .all();
    if (current) throw new Error('Already enrolled in this program');
    return enroll(tx, athlete.id, programId, startDate, color);
  });
}

export type ShiftPlan = {
  enrollmentId: string;
  name: string;
  totalWeeks: number;
  /** Monday each week currently starts on, for the preview. */
  weekStarts: Record<number, string>;
  /** Suggested values: current week and no shift, or the pause week and the weeks elapsed. */
  fromWeek: number;
  weeks: number;
};

/** What the ShiftSheet needs, pre-filled for a shift or for a resume. */
export function getShiftPlan(enrollmentId: string): ShiftPlan | null {
  const [row] = db
    .select({ enrollment, name: program.name, durationDays: program.durationDays })
    .from(enrollment)
    .innerJoin(program, eq(program.id, enrollment.programId))
    .where(eq(enrollment.id, enrollmentId))
    .limit(1)
    .all();
  if (!row) return null;
  const now = today();
  const sessions = sessionsOf(db, enrollmentId);
  const weekStarts: Record<number, string> = {};
  for (const session of sessions) weekStarts[session.week] ??= mondayOf(session.date);

  const { pausedAt } = row.enrollment;
  const fromWeek = pausedAt
    ? (sessions.find((session) => session.date >= pausedAt && !session.workoutId)?.week ?? weekAt(sessions, pausedAt))
    : weekAt(sessions, now);

  return {
    enrollmentId,
    name: row.name,
    totalWeeks: weeksOf(row.durationDays),
    weekStarts,
    fromWeek,
    weeks: pausedAt ? weeksPaused(pausedAt, now) : 0,
  };
}

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Moves every unlogged session from `fromWeek` on by whole weeks. Logged
 * sessions and earlier weeks stay where they are.
 */
function shift(tx: Transaction, enrollmentId: string, fromWeek: number, weeks: number): void {
  if (weeks === 0) return;
  const ids = sessionsOf(tx, enrollmentId)
    .filter((session) => session.week >= fromWeek && !session.workoutId)
    .map((session) => session.id);
  if (ids.length === 0) return;
  tx.update(scheduledSession)
    .set({ scheduledDate: sql`date(${scheduledSession.scheduledDate}, ${`${weeks * 7} days`})` })
    .where(inArray(scheduledSession.id, ids))
    .run();
}

export function shiftEnrollment(enrollmentId: string, fromWeek: number, weeks: number): void {
  db.transaction((tx) => shift(tx, enrollmentId, fromWeek, weeks));
}

export function pauseEnrollment(enrollmentId: string): void {
  db.update(enrollment)
    .set({ status: 'paused', pausedAt: today() })
    .where(and(eq(enrollment.id, enrollmentId), eq(enrollment.status, 'active')))
    .run();
}

/** Resumes a paused enrollment, shifting what was skipped during the pause. */
export function resumeEnrollment(enrollmentId: string, fromWeek: number, weeks: number): void {
  db.transaction((tx) => {
    shift(tx, enrollmentId, fromWeek, weeks);
    tx.update(enrollment)
      .set({ status: 'active', pausedAt: null })
      .where(eq(enrollment.id, enrollmentId))
      .run();
  });
}

/** Archives the enrollment and removes its upcoming unlogged sessions. */
export function stopEnrollment(enrollmentId: string): void {
  const now = today();
  db.transaction((tx) => {
    const upcoming = sessionsOf(tx, enrollmentId)
      .filter((session) => session.date >= now && !session.workoutId)
      .map((session) => session.id);
    if (upcoming.length > 0) {
      tx.update(scheduledSession)
        .set({ deletedAt: Date.now() })
        .where(inArray(scheduledSession.id, upcoming))
        .run();
    }
    tx.update(enrollment)
      .set({ status: 'archived', pausedAt: null })
      .where(eq(enrollment.id, enrollmentId))
      .run();
  });
}

/** Active programs for the calendar filter. */
export function getCalendarPrograms(): { programId: string; name: string; color: string | null }[] {
  const athlete = requireAthlete();
  return db
    .select({ programId: program.id, name: program.name, color: enrollment.color })
    .from(enrollment)
    .innerJoin(program, eq(program.id, enrollment.programId))
    .where(and(eq(enrollment.athleteId, athlete.id), inArray(enrollment.status, ['active', 'paused'])))
    .orderBy(asc(program.name))
    .all();
}
