// End-to-end database flow: migrations, seed, onboarding, a test session that
// produces a reference, and loads resolved from it.

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { before, describe, it } from 'node:test';

import { eq } from 'drizzle-orm';

import { db, schema } from '../../src/db/client';
import { createFreeExerciseLog, loadLogSession, saveLogRows } from '../../src/db/queries/log';
import { completeOnboarding, getAthlete } from '../../src/db/queries/profile';
import {
  ensureWorkout,
  findExerciseLog,
  finishWorkout,
  getFreeWorkouts,
  getScheduledSessions,
  getTodayData,
} from '../../src/db/queries/schedule';
import { seedDatabase } from '../../src/db/seed';
import { buildPlannedRows } from '../../src/features/timer/rows';
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
    saveLogRows(exerciseLogId, rows);
    saveLogRows(exerciseLogId, rows); // saving twice must not duplicate anything

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

  it('adds a free exercise to today', () => {
    const [deadlift] = db.select().from(schema.exercise).where(eq(schema.exercise.slug, 'deadlift')).all();
    const exerciseLogId = createFreeExerciseLog(deadlift.id);
    createFreeExerciseLog(deadlift.id);

    const free = getFreeWorkouts({ from: today(), to: today() });
    assert.equal(free.length, 1);
    assert.deepEqual(free[0].items.map((item) => item.summary), ['8 × 3', '8 × 3']);
    assert.equal(loadLogSession(exerciseLogId)?.dosage.restBetweenSetsS, 120);
  });
});
