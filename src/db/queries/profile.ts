import { and, eq, isNull } from 'drizzle-orm';

import { scheduledDate } from '@/features/schedule/schedule';
import { mondayOf, today } from '@/lib/dates';
import { programColors } from '@/theme/tokens';

import { db, schema } from '../client';

const { coachAthlete, enrollment, plannedSession, program, scheduledSession, userProfile } = schema;

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type Athlete = typeof userProfile.$inferSelect;

/** The athlete using the app, or null before onboarding. */
export function getAthlete(): Athlete | null {
  return db.select().from(userProfile).where(eq(userProfile.isCoach, false)).limit(1).all()[0] ?? null;
}

export function requireAthlete(): Athlete {
  const athlete = getAthlete();
  if (!athlete) throw new Error('No athlete profile: onboarding has not run');
  return athlete;
}

export type OnboardingValues = Pick<
  typeof userProfile.$inferInsert,
  'displayName' | 'weightUnit' | 'boulderGradeSystem' | 'routeGradeSystem' | 'bodyweightKg'
>;

/** Enrolls an athlete in a program and materialises its sessions on the calendar. */
export function enroll(tx: Transaction, athleteId: string, programId: string, startDate: string, color: string) {
  const [created] = tx
    .insert(enrollment)
    .values({ athleteId, programId, startDate, color })
    .returning({ id: enrollment.id })
    .all();
  const sessions = tx
    .select()
    .from(plannedSession)
    .where(and(eq(plannedSession.programId, programId), isNull(plannedSession.deletedAt)))
    .all();
  if (sessions.length > 0) {
    tx.insert(scheduledSession)
      .values(
        sessions.map((session) => ({
          enrollmentId: created.id,
          plannedSessionId: session.id,
          scheduledDate: scheduledDate(startDate, session.weekIndex, session.dayOfWeek),
        })),
      )
      .run();
  }
  return created.id;
}

/**
 * Creates the athlete profile, then hands them the coach programs waiting in
 * the seed: each one is attached to the athlete and starts this week's Monday.
 */
export function completeOnboarding(values: OnboardingValues): void {
  db.transaction((tx) => {
    const [athlete] = tx.insert(userProfile).values(values).returning().all();

    const coachPrograms = tx
      .select({ id: program.id, ownerId: program.ownerId })
      .from(program)
      .innerJoin(userProfile, eq(userProfile.id, program.ownerId))
      .where(and(eq(userProfile.isCoach, true), eq(program.isTemplate, false), isNull(program.athleteId)))
      .all();

    const startDate = mondayOf(today());
    coachPrograms.forEach((coachProgram, index) => {
      tx.update(program).set({ athleteId: athlete.id }).where(eq(program.id, coachProgram.id)).run();
      tx.insert(coachAthlete)
        .values({ coachId: coachProgram.ownerId, athleteId: athlete.id })
        .onConflictDoNothing()
        .run();
      enroll(tx, athlete.id, coachProgram.id, startDate, programColors[index % programColors.length]);
    });
  });
}

export type ProfileSettings = Pick<
  typeof userProfile.$inferInsert,
  | 'displayName'
  | 'bodyweightKg'
  | 'weightUnit'
  | 'boulderGradeSystem'
  | 'routeGradeSystem'
  | 'theme'
  | 'prepCountdownS'
  | 'sideSwitchRestS'
  | 'timerVolume'
  | 'timerSoundsEnabled'
  | 'hapticsEnabled'
>;

/** Saves settings of the athlete (docs/screens.md S13). */
export function updateProfile(values: Partial<ProfileSettings>): void {
  const athlete = requireAthlete();
  db.update(userProfile).set(values).where(eq(userProfile.id, athlete.id)).run();
}
