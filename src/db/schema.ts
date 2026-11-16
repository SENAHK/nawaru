// Relational schema for V1. Source of truth: docs/data-model.md.
// Keep this file free of React Native imports: drizzle-kit loads it in Node.

import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
  type AnySQLiteColumn,
} from 'drizzle-orm/sqlite-core';

import {
  bodyRegions,
  boulderGradeSystems,
  categories,
  coachAthleteStatuses,
  dosageSchemes,
  effortScales,
  enrollmentStatuses,
  fingerCounts,
  gripTypes,
  loadModes,
  measures,
  mediaKinds,
  muscleRoles,
  progressionKinds,
  routeGradeSystems,
  setResults,
  setSides,
  sides,
  themePreferences,
  weightUnits,
} from './enums';
import { uuidv7 } from './ids';

/** Columns shared by every table: UUID v7 id, ms-epoch timestamps, soft delete. */
const base = () => ({
  id: text('id').primaryKey().$defaultFn(uuidv7),
  createdAt: integer('created_at')
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer('updated_at')
    .notNull()
    .$defaultFn(() => Date.now())
    .$onUpdateFn(() => Date.now()),
  deletedAt: integer('deleted_at'),
});

/** CHECK constraint restricting a text column to a closed list (NULL passes). */
const oneOf = (name: string, column: AnySQLiteColumn, values: readonly string[]) =>
  check(name, sql`${column} in (${sql.raw(values.map((value) => `'${value}'`).join(', '))})`);

const bool = (name: string) => integer(name, { mode: 'boolean' });

/** Dosage columns: which ones are used depends on the exercise's dosage scheme. */
const dosageColumns = () => ({
  sets: integer('sets'),
  reps: integer('reps'),
  durationS: integer('duration_s'),
  onS: integer('on_s'),
  offS: integer('off_s'),
  restBetweenSetsS: integer('rest_between_sets_s'),
  rounds: integer('rounds'),
  itemsPerRound: integer('items_per_round'),
  slotDurationS: integer('slot_duration_s'),
  totalDurationS: integer('total_duration_s'),
});

// ---------------------------------------------------------------------------
// Catalogue (read-only in V1, seeded)
// ---------------------------------------------------------------------------

export const exercise = sqliteTable(
  'exercise',
  {
    ...base(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    instructions: text('instructions').notNull().default(''),
    category: text('category', { enum: categories }).notNull(),
    dosageScheme: text('dosage_scheme', { enum: dosageSchemes }).notNull(),
    defaultEffortScale: text('default_effort_scale', { enum: effortScales }).notNull(),
    unilateralAllowed: bool('unilateral_allowed').notNull().default(false),
    isTestable: bool('is_testable').notNull().default(false),
  },
  (t) => [
    oneOf('exercise_category_check', t.category, categories),
    oneOf('exercise_dosage_scheme_check', t.dosageScheme, dosageSchemes),
    oneOf('exercise_effort_scale_check', t.defaultEffortScale, effortScales),
  ],
);

export const muscle = sqliteTable(
  'muscle',
  {
    ...base(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    bodyRegion: text('body_region', { enum: bodyRegions }).notNull(),
  },
  (t) => [oneOf('muscle_body_region_check', t.bodyRegion, bodyRegions)],
);

export const exerciseMuscle = sqliteTable(
  'exercise_muscle',
  {
    ...base(),
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => exercise.id),
    muscleId: text('muscle_id')
      .notNull()
      .references(() => muscle.id),
    role: text('role', { enum: muscleRoles }).notNull(),
  },
  (t) => [
    uniqueIndex('exercise_muscle_unique').on(t.exerciseId, t.muscleId),
    index('exercise_muscle_muscle_idx').on(t.muscleId),
    oneOf('exercise_muscle_role_check', t.role, muscleRoles),
  ],
);

export const equipment = sqliteTable('equipment', {
  ...base(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
});

export const exerciseEquipment = sqliteTable(
  'exercise_equipment',
  {
    ...base(),
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => exercise.id),
    equipmentId: text('equipment_id')
      .notNull()
      .references(() => equipment.id),
  },
  (t) => [
    uniqueIndex('exercise_equipment_unique').on(t.exerciseId, t.equipmentId),
    index('exercise_equipment_equipment_idx').on(t.equipmentId),
  ],
);

export const exerciseMeasure = sqliteTable(
  'exercise_measure',
  {
    ...base(),
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => exercise.id),
    measure: text('measure', { enum: measures }).notNull(),
  },
  (t) => [
    uniqueIndex('exercise_measure_unique').on(t.exerciseId, t.measure),
    oneOf('exercise_measure_check', t.measure, measures),
  ],
);

export const exerciseMedia = sqliteTable(
  'exercise_media',
  {
    ...base(),
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => exercise.id),
    kind: text('kind', { enum: mediaKinds }).notNull(),
    uri: text('uri').notNull(),
    sort: integer('sort').notNull().default(0),
  },
  (t) => [
    index('exercise_media_exercise_idx').on(t.exerciseId),
    oneOf('exercise_media_kind_check', t.kind, mediaKinds),
  ],
);

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export const userProfile = sqliteTable(
  'user_profile',
  {
    ...base(),
    displayName: text('display_name').notNull(),
    isCoach: bool('is_coach').notNull().default(false),
    bodyweightKg: real('bodyweight_kg'),
    weightUnit: text('weight_unit', { enum: weightUnits }).notNull().default('kg'),
    boulderGradeSystem: text('boulder_grade_system', { enum: boulderGradeSystems })
      .notNull()
      .default('font'),
    routeGradeSystem: text('route_grade_system', { enum: routeGradeSystems })
      .notNull()
      .default('french'),
    prepCountdownS: integer('prep_countdown_s').notNull().default(10),
    sideSwitchRestS: integer('side_switch_rest_s').notNull().default(10),
    theme: text('theme', { enum: themePreferences }).notNull().default('dark'),
    timerSoundsEnabled: bool('timer_sounds_enabled').notNull().default(true),
    timerVolume: integer('timer_volume').notNull().default(100),
    hapticsEnabled: bool('haptics_enabled').notNull().default(true),
  },
  (t) => [
    oneOf('user_profile_weight_unit_check', t.weightUnit, weightUnits),
    oneOf('user_profile_boulder_grades_check', t.boulderGradeSystem, boulderGradeSystems),
    oneOf('user_profile_route_grades_check', t.routeGradeSystem, routeGradeSystems),
    oneOf('user_profile_theme_check', t.theme, themePreferences),
    check('user_profile_timer_volume_check', sql`${t.timerVolume} between 0 and 100`),
  ],
);

export const exerciseFavorite = sqliteTable(
  'exercise_favorite',
  {
    ...base(),
    userId: text('user_id')
      .notNull()
      .references(() => userProfile.id),
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => exercise.id),
  },
  (t) => [uniqueIndex('exercise_favorite_unique').on(t.userId, t.exerciseId)],
);

export const coachAthlete = sqliteTable(
  'coach_athlete',
  {
    ...base(),
    coachId: text('coach_id')
      .notNull()
      .references(() => userProfile.id),
    athleteId: text('athlete_id')
      .notNull()
      .references(() => userProfile.id),
    status: text('status', { enum: coachAthleteStatuses }).notNull().default('active'),
    logsVisible: bool('logs_visible').notNull().default(true),
  },
  (t) => [
    uniqueIndex('coach_athlete_unique').on(t.coachId, t.athleteId),
    oneOf('coach_athlete_status_check', t.status, coachAthleteStatuses),
  ],
);

// ---------------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------------

export const program = sqliteTable(
  'program',
  {
    ...base(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => userProfile.id),
    athleteId: text('athlete_id').references(() => userProfile.id),
    isTemplate: bool('is_template').notNull().default(false),
    templateId: text('template_id').references((): AnySQLiteColumn => program.id),
    templateVersion: integer('template_version'),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    durationDays: integer('duration_days').notNull(),
  },
  (t) => [index('program_owner_idx').on(t.ownerId), index('program_athlete_idx').on(t.athleteId)],
);

export const programPhase = sqliteTable(
  'program_phase',
  {
    ...base(),
    programId: text('program_id')
      .notNull()
      .references(() => program.id),
    name: text('name').notNull(),
    startWeek: integer('start_week').notNull(),
    endWeek: integer('end_week').notNull(),
    isTest: bool('is_test').notNull().default(false),
    sort: integer('sort').notNull().default(0),
  },
  (t) => [
    index('program_phase_program_idx').on(t.programId),
    check('program_phase_weeks_check', sql`${t.startWeek} >= 1 and ${t.endWeek} >= ${t.startWeek}`),
  ],
);

export const plannedSession = sqliteTable(
  'planned_session',
  {
    ...base(),
    programId: text('program_id')
      .notNull()
      .references(() => program.id),
    weekIndex: integer('week_index').notNull(),
    dayOfWeek: integer('day_of_week').notNull(),
    sort: integer('sort').notNull().default(0),
    name: text('name'),
    isTest: bool('is_test').notNull().default(false),
    notes: text('notes').notNull().default(''),
  },
  (t) => [
    index('planned_session_program_idx').on(t.programId, t.weekIndex, t.dayOfWeek),
    check('planned_session_week_check', sql`${t.weekIndex} >= 1`),
    check('planned_session_day_check', sql`${t.dayOfWeek} between 1 and 7`),
  ],
);

export const progressionRule = sqliteTable(
  'progression_rule',
  {
    ...base(),
    programId: text('program_id')
      .notNull()
      .references(() => program.id),
    kind: text('kind', { enum: progressionKinds }).notNull(),
    value: real('value').notNull(),
  },
  (t) => [oneOf('progression_rule_kind_check', t.kind, progressionKinds)],
);

export const prescription = sqliteTable(
  'prescription',
  {
    ...base(),
    plannedSessionId: text('planned_session_id')
      .notNull()
      .references(() => plannedSession.id),
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => exercise.id),
    sort: integer('sort').notNull().default(0),
    ...dosageColumns(),
    // Load: `loadValue` is in kg, or in % for `percent_reference`.
    loadMode: text('load_mode', { enum: loadModes }).notNull().default('none'),
    loadValue: real('load_value'),
    gripType: text('grip_type', { enum: gripTypes }),
    fingerCount: text('finger_count', { enum: fingerCounts }),
    side: text('side', { enum: sides }),
    edgeMm: integer('edge_mm'),
    supportLabel: text('support_label'),
    tempo: text('tempo'),
    targetGrade: text('target_grade'),
    targetEffort: real('target_effort'),
    effortScale: text('effort_scale', { enum: effortScales }).notNull(),
    isTest: bool('is_test').notNull().default(false),
    progressionRuleId: text('progression_rule_id').references(() => progressionRule.id),
    notes: text('notes').notNull().default(''),
  },
  (t) => [
    index('prescription_session_idx').on(t.plannedSessionId, t.sort),
    index('prescription_exercise_idx').on(t.exerciseId),
    oneOf('prescription_load_mode_check', t.loadMode, loadModes),
    oneOf('prescription_grip_type_check', t.gripType, gripTypes),
    oneOf('prescription_finger_count_check', t.fingerCount, fingerCounts),
    oneOf('prescription_side_check', t.side, sides),
    oneOf('prescription_effort_scale_check', t.effortScale, effortScales),
  ],
);

// ---------------------------------------------------------------------------
// Calendar and logs
// ---------------------------------------------------------------------------

export const enrollment = sqliteTable(
  'enrollment',
  {
    ...base(),
    athleteId: text('athlete_id')
      .notNull()
      .references(() => userProfile.id),
    programId: text('program_id')
      .notNull()
      .references(() => program.id),
    /** YYYY-MM-DD, always a Monday (checked when written). */
    startDate: text('start_date').notNull(),
    status: text('status', { enum: enrollmentStatuses }).notNull().default('active'),
    /** YYYY-MM-DD while paused, null otherwise. */
    pausedAt: text('paused_at'),
    color: text('color'),
  },
  (t) => [
    index('enrollment_athlete_idx').on(t.athleteId, t.status),
    oneOf('enrollment_status_check', t.status, enrollmentStatuses),
  ],
);

export const scheduledSession = sqliteTable(
  'scheduled_session',
  {
    ...base(),
    enrollmentId: text('enrollment_id')
      .notNull()
      .references(() => enrollment.id),
    plannedSessionId: text('planned_session_id')
      .notNull()
      .references(() => plannedSession.id),
    /** YYYY-MM-DD, materialised at enrollment. */
    scheduledDate: text('scheduled_date').notNull(),
  },
  (t) => [
    index('scheduled_session_date_idx').on(t.scheduledDate),
    index('scheduled_session_enrollment_idx').on(t.enrollmentId),
  ],
);

export const workout = sqliteTable(
  'workout',
  {
    ...base(),
    athleteId: text('athlete_id')
      .notNull()
      .references(() => userProfile.id),
    /** Null for a free session. */
    scheduledSessionId: text('scheduled_session_id')
      .unique()
      .references(() => scheduledSession.id),
    /** YYYY-MM-DD, the day it was actually done. */
    performedOn: text('performed_on').notNull(),
    startedAt: integer('started_at'),
    endedAt: integer('ended_at'),
    notes: text('notes').notNull().default(''),
  },
  (t) => [index('workout_performed_on_idx').on(t.athleteId, t.performedOn)],
);

export const exerciseLog = sqliteTable(
  'exercise_log',
  {
    ...base(),
    workoutId: text('workout_id')
      .notNull()
      .references(() => workout.id),
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => exercise.id),
    /** Null for an exercise added freely. */
    prescriptionId: text('prescription_id').references(() => prescription.id),
    sort: integer('sort').notNull().default(0),
    // Dosage targeted for this log: copied from the prescription, or entered
    // for a free exercise. Kept here so later program edits never change it.
    ...dosageColumns(),
    /** Target load in kg (resolved from the prescription), null if none. */
    targetLoadKg: real('target_load_kg'),
    gripType: text('grip_type', { enum: gripTypes }),
    fingerCount: text('finger_count', { enum: fingerCounts }),
    side: text('side', { enum: sides }),
    edgeMm: integer('edge_mm'),
    supportLabel: text('support_label'),
    effortScale: text('effort_scale', { enum: effortScales }),
    effortValue: real('effort_value'),
    notes: text('notes').notNull().default(''),
  },
  (t) => [
    index('exercise_log_workout_idx').on(t.workoutId, t.sort),
    index('exercise_log_exercise_idx').on(t.exerciseId),
    oneOf('exercise_log_grip_type_check', t.gripType, gripTypes),
    oneOf('exercise_log_finger_count_check', t.fingerCount, fingerCounts),
    oneOf('exercise_log_side_check', t.side, sides),
    oneOf('exercise_log_effort_scale_check', t.effortScale, effortScales),
  ],
);

export const setLog = sqliteTable(
  'set_log',
  {
    ...base(),
    exerciseLogId: text('exercise_log_id')
      .notNull()
      .references(() => exerciseLog.id),
    /** Set, slot or climb number. */
    setIndex: integer('set_index').notNull(),
    roundIndex: integer('round_index'),
    itemIndex: integer('item_index'),
    side: text('side', { enum: setSides }),
    repsDone: integer('reps_done'),
    durationS: integer('duration_s'),
    /** Always kg; negative means assistance. */
    loadKg: real('load_kg'),
    grade: text('grade'),
    gradeSystem: text('grade_system'),
    result: text('result', { enum: setResults }).notNull().default('success'),
    effortValue: real('effort_value'),
  },
  (t) => [
    index('set_log_exercise_log_idx').on(t.exerciseLogId, t.setIndex),
    oneOf('set_log_side_check', t.side, setSides),
    oneOf('set_log_result_check', t.result, setResults),
  ],
);

export const reference = sqliteTable(
  'reference',
  {
    ...base(),
    athleteId: text('athlete_id')
      .notNull()
      .references(() => userProfile.id),
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => exercise.id),
    // Matching key with a `percent_reference` prescription.
    gripType: text('grip_type', { enum: gripTypes }),
    fingerCount: text('finger_count', { enum: fingerCounts }),
    side: text('side', { enum: sides }),
    edgeMm: integer('edge_mm'),
    durationS: integer('duration_s'),
    valueKg: real('value_kg').notNull(),
    /** YYYY-MM-DD */
    measuredOn: text('measured_on').notNull(),
    sourceSetLogId: text('source_set_log_id').references(() => setLog.id),
  },
  (t) => [
    index('reference_lookup_idx').on(t.athleteId, t.exerciseId, t.measuredOn),
    oneOf('reference_grip_type_check', t.gripType, gripTypes),
    oneOf('reference_finger_count_check', t.fingerCount, fingerCounts),
    oneOf('reference_side_check', t.side, sides),
  ],
);

// ---------------------------------------------------------------------------
// Local only (never synced)
// ---------------------------------------------------------------------------

/** Single-row table holding the running timer (docs/timer.md §5). */
export const activeTimer = sqliteTable('active_timer', {
  id: integer('id').primaryKey(),
  exerciseLogId: text('exercise_log_id')
    .notNull()
    .references(() => exerciseLog.id),
  stateJson: text('state_json').notNull(),
  updatedAt: integer('updated_at').notNull(),
});
