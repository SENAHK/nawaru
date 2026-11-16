import { assertValidDosage } from '../dosage';
import { uuidv7 } from '../ids';
import type * as schema from '../schema';
import { equipment, exercises, muscles } from './catalog';
import { demoCoach, demoProgram } from './demo-program';

type Insert<T extends { $inferInsert: unknown }> = T['$inferInsert'];

export type SeedRows = {
  muscle: Insert<typeof schema.muscle>[];
  equipment: Insert<typeof schema.equipment>[];
  exercise: Insert<typeof schema.exercise>[];
  exerciseMuscle: Insert<typeof schema.exerciseMuscle>[];
  exerciseEquipment: Insert<typeof schema.exerciseEquipment>[];
  exerciseMeasure: Insert<typeof schema.exerciseMeasure>[];
  userProfile: Insert<typeof schema.userProfile>[];
  program: Insert<typeof schema.program>[];
  programPhase: Insert<typeof schema.programPhase>[];
  plannedSession: Insert<typeof schema.plannedSession>[];
  prescription: Insert<typeof schema.prescription>[];
};

function lookup(kind: string, ids: Map<string, string>, slug: string): string {
  const id = ids.get(slug);
  if (!id) throw new Error(`Seed: unknown ${kind} "${slug}"`);
  return id;
}

/**
 * Builds every seed row in memory: exercise library, dummy coach and demo
 * program. Pure (no database access) so it can be checked outside the app.
 */
export function buildSeed(): SeedRows {
  const rows: SeedRows = {
    muscle: [],
    equipment: [],
    exercise: [],
    exerciseMuscle: [],
    exerciseEquipment: [],
    exerciseMeasure: [],
    userProfile: [],
    program: [],
    programPhase: [],
    plannedSession: [],
    prescription: [],
  };

  const muscleIds = new Map<string, string>();
  for (const muscle of muscles) {
    const id = uuidv7();
    muscleIds.set(muscle.slug, id);
    rows.muscle.push({ id, ...muscle });
  }

  const equipmentIds = new Map<string, string>();
  for (const item of equipment) {
    const id = uuidv7();
    equipmentIds.set(item.slug, id);
    rows.equipment.push({ id, ...item });
  }

  const exerciseBySlug = new Map<string, { id: string; seed: (typeof exercises)[number] }>();
  for (const seed of exercises) {
    const id = uuidv7();
    exerciseBySlug.set(seed.slug, { id, seed });
    rows.exercise.push({
      id,
      slug: seed.slug,
      name: seed.name,
      description: seed.description,
      instructions: seed.instructions,
      category: seed.category,
      dosageScheme: seed.scheme,
      defaultEffortScale: seed.effort,
      unilateralAllowed: seed.unilateral ?? false,
      isTestable: seed.testable ?? false,
    });
    for (const slug of seed.primary) {
      rows.exerciseMuscle.push({
        exerciseId: id,
        muscleId: lookup('muscle', muscleIds, slug),
        role: 'primary',
      });
    }
    for (const slug of seed.secondary ?? []) {
      rows.exerciseMuscle.push({
        exerciseId: id,
        muscleId: lookup('muscle', muscleIds, slug),
        role: 'secondary',
      });
    }
    for (const slug of seed.equipment) {
      rows.exerciseEquipment.push({
        exerciseId: id,
        equipmentId: lookup('equipment', equipmentIds, slug),
      });
    }
    for (const measure of seed.measures) {
      rows.exerciseMeasure.push({ exerciseId: id, measure });
    }
  }

  // Dummy coach and its demo program. The program is attached to the athlete
  // and enrolled at onboarding, once the athlete profile exists.
  const coachId = uuidv7();
  rows.userProfile.push({ id: coachId, displayName: demoCoach.displayName, isCoach: true });

  const programId = uuidv7();
  rows.program.push({
    id: programId,
    ownerId: coachId,
    name: demoProgram.name,
    description: demoProgram.description,
    durationDays: demoProgram.weeks * 7,
  });
  demoProgram.phases.forEach((phase, sort) => {
    rows.programPhase.push({ programId, ...phase, sort });
  });

  for (const session of demoProgram.sessions) {
    if (session.week > demoProgram.weeks) {
      throw new Error(`Seed: session "${session.name}" is outside the program`);
    }
    const plannedSessionId = uuidv7();
    rows.plannedSession.push({
      id: plannedSessionId,
      programId,
      weekIndex: session.week,
      dayOfWeek: session.day,
      name: session.name,
      isTest: session.isTest ?? false,
    });
    session.prescriptions.forEach(({ exercise: slug, ...values }, sort) => {
      const entry = exerciseBySlug.get(slug);
      if (!entry) throw new Error(`Seed: unknown exercise "${slug}"`);
      assertValidDosage(entry.seed.scheme, values);
      rows.prescription.push({
        plannedSessionId,
        exerciseId: entry.id,
        sort,
        effortScale: entry.seed.effort,
        ...values,
      });
    });
  }

  return rows;
}
