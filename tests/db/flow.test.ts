// End-to-end database flow: migrations, seed, onboarding, a test session that
// produces a reference, and loads resolved from it.

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { before, describe, it } from 'node:test';

import { eq } from 'drizzle-orm';

import { db, schema } from '../../src/db/client';
import { addFreeExercise, getAddExerciseDraft, loadLogSession, saveLog } from '../../src/db/queries/log';
import { completeOnboarding, getAthlete } from '../../src/db/queries/profile';
import {
  deleteWorkout,
  ensureWorkout,
  findExerciseLog,
  finishWorkout,
  getActiveWorkout,
  getFreeWorkouts,
  getScheduledSessions,
  getTodayData,
  setPerformedOn,
  startWorkout,
} from '../../src/db/queries/schedule';
import {
  enrollInProgram,
  getProgramsOverview,
  getShiftPlan,
  pauseEnrollment,
  resumeEnrollment,
  shiftEnrollment,
  stopEnrollment,
} from '../../src/db/queries/enrollment';
import { getLibrary, isFavorite, toggleFavorite } from '../../src/db/queries/library';
import { seedDatabase } from '../../src/db/seed';
import { addClimbRow, buildPlannedRows, removeClimbRow } from '../../src/features/timer/rows';
import { addDays, mondayOf, today } from '../../src/lib/dates';

const monday = mondayOf(today());

before(() => {
  const dir = join(__dirname, '..', '..', 'drizzle');
  for (const file of readdirSync(dir).filter((name) => name.endsWith('.sql')).sort()) {
    for (const statement of readFileSync(join(dir, file), 'utf8').split('--> statement-breakpoint')) {
      if (statement.trim()) db.run(statement);
    }
  }
  db.run('PRAGMA foreign_keys = ON');
  seedDatabase(db);
});

describe('database flow', () => {
  it('starts without an athlete, then onboarding enrolls them in the coach program', () => {
    assert.equal(getAthlete(), null);
    completeOnboarding({ displayName: 'Mike', weightUnit: 'kg', boulderGradeSystem: 'font', routeGradeSystem: 'french', bodyweightKg: 70 });
    assert.equal(getAthlete()?.displayName, 'Mike');

    const all = getScheduledSessions({ from: monday, to: addDays(monday, 27) });
    assert.equal(all.length, 10);
    assert.equal(all[0].scheduledDate, monday);
    assert.deepEqual(all[0].program && [all[0].program.week, all[0].program.day, all[0].program.author], [1, 1, 'Coach Alex']);

    const data = getTodayData(today());
    assert.equal(data.hasActiveProgram, true);
    assert.equal(data.week.planned, 2);
    assert.equal(data.lastReference, null);
  });

  it('shows percentage loads without a reference before the test', () => {
    const [session] = getScheduledSessions({ from: addDays(monday, 7), to: addDays(monday, 7) });
    assert.equal(session.title, 'Finger strength');
    assert.deepEqual(
      session.items.map((item) => [item.name, item.summary, item.loadLabel]),
      [
        ['Progressive finger warm-up', '10s × 5 · 20 mm · 4F HC', ''],
        ['Max hangs', '10s × 5 · 20 mm · 4F HC', '85% ref · no test yet'],
        ['Weighted pull-ups', '5 × 4', ''],
      ],
    );
  });

  it('logs the test session and creates a reference from the best successful set', () => {
    const [session] = getScheduledSessions({ from: monday, to: monday });
    assert.equal(session.isTest, true);
    const workoutId = ensureWorkout(session.scheduledSessionId!, true);
    assert.equal(ensureWorkout(session.scheduledSessionId!, true), workoutId);

    const testItem = session.items[1];
    const exerciseLogId = findExerciseLog(workoutId, testItem.key)!;
    const log = loadLogSession(exerciseLogId)!;
    assert.equal(log.exerciseName, 'Max hang test (10s)');
    assert.equal(log.usesHangboard, true);

    const loads = [20, 26, 24];
    const rows = buildPlannedRows(log.dosage, null).map((row, index) => ({
      ...row,
      loadKg: loads[index],
      result: index === 1 ? ('fail' as const) : ('success' as const),
      done: true,
    }));
    const details = { ...log.details, effortValue: 9, notes: '  Felt strong  ' };
    saveLog(exerciseLogId, rows, details, log.gradeSystem);
    // Saving twice must not duplicate anything.
    const created = saveLog(exerciseLogId, rows, details, log.gradeSystem);
    assert.equal(created?.valueKg, 24);

    const saved = loadLogSession(exerciseLogId)!;
    assert.deepEqual([saved.details.effortValue, saved.details.notes, saved.savedSets.length], [9, 'Felt strong', 3]);

    const references = db.select().from(schema.reference).all().filter((r) => r.deletedAt == null);
    assert.equal(references.length, 1);
    assert.deepEqual(
      [references[0].valueKg, references[0].edgeMm, references[0].gripType, references[0].durationS],
      [24, 20, 'half_crimp', 10],
    );

    const [after] = getScheduledSessions({ scheduledSessionId: session.scheduledSessionId! });
    assert.equal(after.status, 'in_progress');
    assert.deepEqual(after.items.map((item) => item.state), ['todo', 'partial']);

    finishWorkout(workoutId);
    assert.equal(getScheduledSessions({ scheduledSessionId: session.scheduledSessionId! })[0].status, 'done');
    assert.equal(getTodayData(today()).lastReference?.valueKg, 24);
  });

  it('resolves later percentage prescriptions from that reference', () => {
    const [session] = getScheduledSessions({ from: addDays(monday, 7), to: addDays(monday, 7) });
    assert.equal(session.items[1].loadLabel, '+20.5 kg (85% ref)');

    const workoutId = ensureWorkout(session.scheduledSessionId!, false);
    const log = db
      .select()
      .from(schema.exerciseLog)
      .where(eq(schema.exerciseLog.id, findExerciseLog(workoutId, session.items[1].key)!))
      .all()[0];
    assert.equal(log.targetLoadKg, 20.5);

    const [withWorkout] = getScheduledSessions({ scheduledSessionId: session.scheduledSessionId! });
    assert.equal(withWorkout.items[1].loadLabel, '+20.5 kg (85% ref)');
    // A workout created without "Start session" and nothing logged keeps the planned status.
    assert.notEqual(withWorkout.status, 'in_progress');
  });

  it('adds a free exercise to today, pre-filled from the last time', () => {
    const [deadlift] = db.select().from(schema.exercise).where(eq(schema.exercise.slug, 'deadlift')).all();
    const draft = getAddExerciseDraft(deadlift.id)!;
    assert.equal(draft.source, 'default');
    const exerciseLogId = addFreeExercise(null, { ...draft, dosage: { ...draft.dosage, reps: 5 } });
    const log = loadLogSession(exerciseLogId)!;
    assert.equal(log.dosage.restBetweenSetsS, 120);
    assert.equal(log.prescribed, null);
    saveLog(
      exerciseLogId,
      buildPlannedRows(log.dosage, 80).map((row) => ({ ...row, done: true })),
      log.details,
      log.gradeSystem,
    );

    const next = getAddExerciseDraft(deadlift.id)!;
    assert.deepEqual([next.source, next.dosage.reps, next.targetLoadKg], ['last', 5, 80]);
    addFreeExercise(null, next);

    const free = getFreeWorkouts({ from: today(), to: today() });
    assert.equal(free.length, 1);
    assert.deepEqual(free[0].items.map((item) => item.summary), ['5 × 3', '5 × 3']);
  });

  it('logs climbs with grades on a free duration exercise', () => {
    const [bouldering] = db
      .select()
      .from(schema.exercise)
      .where(eq(schema.exercise.dosageScheme, 'free_duration'))
      .all();
    const exerciseLogId = addFreeExercise(null, getAddExerciseDraft(bouldering.id)!);
    const log = loadLogSession(exerciseLogId)!;
    let rows = addClimbRow(addClimbRow(addClimbRow(buildPlannedRows(log.dosage, null))));
    rows = removeClimbRow(rows, rows[2].key).map((row, index) => ({ ...row, grade: index > 0 ? `7A${index}` : null }));
    assert.deepEqual(rows.map((row) => row.setIndex), [1, 2, 3]);
    saveLog(exerciseLogId, rows, log.details, log.gradeSystem);

    const saved = loadLogSession(exerciseLogId)!.savedSets;
    assert.deepEqual(
      saved.map((set) => [set.setIndex, set.grade, set.gradeSystem]),
      [
        [1, null, null],
        [2, '7A1', 'font'],
        [3, '7A2', 'font'],
      ],
    );
  });

  it('adds an exercise to a planned session, then moves and deletes its log', () => {
    const date = addDays(monday, 14);
    const [session] = getScheduledSessions({ from: date, to: date });
    const [pullUps] = db.select().from(schema.exercise).where(eq(schema.exercise.slug, 'pull-ups')).all();
    addFreeExercise({ scheduledSessionId: session.scheduledSessionId! }, getAddExerciseDraft(pullUps.id)!);

    let [after] = getScheduledSessions({ scheduledSessionId: session.scheduledSessionId! });
    assert.equal(after.items.length, session.items.length + 1);
    assert.equal(after.items.at(-1)?.name, 'Pull-ups');

    startWorkout(after.workoutId!);
    assert.equal(getActiveWorkout()?.workoutId, after.workoutId);

    setPerformedOn(after.workoutId!, addDays(date, -1));
    [after] = getScheduledSessions({ scheduledSessionId: session.scheduledSessionId! });
    assert.deepEqual([after.scheduledDate, after.performedOn], [date, addDays(date, -1)]);

    deleteWorkout(after.workoutId!);
    [after] = getScheduledSessions({ scheduledSessionId: session.scheduledSessionId! });
    assert.deepEqual([after.workoutId, after.items.length], [null, session.items.length]);
    assert.equal(getActiveWorkout(), null);
    // It can be logged again.
    assert.ok(ensureWorkout(session.scheduledSessionId!, false));
  });
});

describe('enrollments', () => {
  const range = () => getScheduledSessions({ from: addDays(monday, -7), to: addDays(monday, 90) });
  const datesOfWeek = (week: number) =>
    range()
      .filter((session) => session.program?.week === week)
      .map((session) => session.scheduledDate);

  it('lists the coach program as active, in week 1 of 4', () => {
    const { active, archived, mine } = getProgramsOverview();
    assert.equal(active.length, 1);
    assert.deepEqual([active[0].name, active[0].author, active[0].currentWeek, active[0].totalWeeks], [
      'Finger strength block',
      'Coach Alex',
      1,
      4,
    ]);
    assert.deepEqual([archived.length, mine.length], [0, 0]);
    assert.throws(() => enrollInProgram(active[0].programId, monday, '#fff'), /Already enrolled/);
  });

  it('shifts unlogged sessions from a week on, keeping weekdays', () => {
    const { enrollmentId } = getProgramsOverview().active[0];
    const plan = getShiftPlan(enrollmentId)!;
    assert.deepEqual([plan.fromWeek, plan.weeks, plan.weekStarts[1]], [1, 0, monday]);

    const before = datesOfWeek(4);
    shiftEnrollment(enrollmentId, 4, 2);
    assert.deepEqual(datesOfWeek(4), before.map((date) => addDays(date, 14)));
    // Week 1 holds a logged session: it never moves, even when shifting from week 1.
    const week1 = datesOfWeek(1);
    shiftEnrollment(enrollmentId, 1, -1);
    assert.ok(datesOfWeek(1).includes(week1[0]));
    assert.ok(datesOfWeek(1).includes(addDays(week1[1], -7)));
    shiftEnrollment(enrollmentId, 1, 1);
    assert.deepEqual(datesOfWeek(1), week1);
  });

  it('pauses, then resumes with the suggested shift', () => {
    const { enrollmentId } = getProgramsOverview().active[0];
    pauseEnrollment(enrollmentId);
    let row = getProgramsOverview().active[0];
    assert.deepEqual([row.status, row.pausedAt], ['paused', today()]);
    // Unlogged sessions from today on are hidden while paused.
    assert.ok(range().every((session) => session.scheduledDate < today() || session.workoutId != null));

    const plan = getShiftPlan(enrollmentId)!;
    assert.equal(plan.weeks, 0);
    resumeEnrollment(enrollmentId, plan.fromWeek, 1);
    row = getProgramsOverview().active[0];
    assert.deepEqual([row.status, row.pausedAt], ['active', null]);
  });

  it('stops: upcoming unlogged sessions go, logged ones stay, and it can be followed again', () => {
    const { enrollmentId, programId } = getProgramsOverview().active[0];
    stopEnrollment(enrollmentId);
    const overview = getProgramsOverview();
    assert.deepEqual([overview.active.length, overview.archived.length], [0, 1]);
    assert.ok(range().every((session) => session.workoutId != null));
    assert.equal(getTodayData(today()).hasActiveProgram, false);

    const next = addDays(monday, 7);
    enrollInProgram(programId, next, '#9A7DD4');
    const again = getProgramsOverview();
    assert.deepEqual([again.active.length, again.archived.length, again.active[0].startDate], [1, 0, next]);
    assert.throws(() => enrollInProgram(programId, addDays(next, 1), '#fff'), /not a Monday/);
  });
});

describe('library', () => {
  it('lists the seeded exercises with muscles and equipment', () => {
    const library = getLibrary();
    assert.equal(library.length, 25);
    const hangs = library.find((item) => item.name === 'Max hangs')!;
    assert.ok(hangs.equipment.some((gear) => gear.name === 'Hangboard'));
    assert.ok(hangs.muscles.some((muscle) => muscle.role === 'primary'));
  });

  it('stars and unstars an exercise without duplicating rows', () => {
    const [first] = getLibrary();
    assert.equal(toggleFavorite(first.id), true);
    assert.equal(toggleFavorite(first.id), false);
    assert.equal(toggleFavorite(first.id), true);
    assert.equal(isFavorite(first.id), true);
    assert.equal(getLibrary().filter((item) => item.favorite).length, 1);
    assert.equal(db.select().from(schema.exerciseFavorite).all().length, 1);
  });
});
