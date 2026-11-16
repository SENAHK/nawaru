// Closed value lists from docs/data-model.md. Stored as constrained text.

export const categories = ['fingers', 'strength', 'climbing', 'mobility', 'conditioning', 'warmup'] as const;
export const dosageSchemes = ['reps', 'isometric', 'intervals', 'circuit', 'slots', 'free_duration'] as const;
export const effortScales = ['rpe', 'rir', 'feel'] as const;
export const muscleRoles = ['primary', 'secondary'] as const;
export const bodyRegions = ['arms', 'shoulders', 'back', 'chest', 'core', 'legs'] as const;
export const measures = ['load', 'grip', 'edge', 'grade', 'tempo', 'range', 'effort', 'result'] as const;
export const mediaKinds = ['video', 'image'] as const;

export const weightUnits = ['kg', 'lbs'] as const;
export const boulderGradeSystems = ['font', 'v_scale'] as const;
export const routeGradeSystems = ['french', 'yds'] as const;
export const themePreferences = ['dark', 'light', 'system'] as const;
export const coachAthleteStatuses = ['active', 'ended'] as const;

export const loadModes = ['none', 'absolute', 'added', 'assisted', 'percent_reference'] as const;
export const gripTypes = ['half_crimp', 'full_crimp', 'open_drag', 'pocket', 'pinch', 'sloper'] as const;
export const fingerCounts = [
  'four',
  'three_front',
  'three_back',
  'two_front',
  'two_middle',
  'two_back',
  'mono',
] as const;
export const sides = ['both', 'left', 'right', 'alternate'] as const;
export const setSides = ['left', 'right'] as const;
export const progressionKinds = ['add_load_per_week', 'add_percent_per_week', 'percent_of_reference'] as const;

export const enrollmentStatuses = ['active', 'paused', 'completed', 'archived'] as const;
export const setResults = ['success', 'fail'] as const;

export type Category = (typeof categories)[number];
export type DosageScheme = (typeof dosageSchemes)[number];
export type EffortScale = (typeof effortScales)[number];
export type MuscleRole = (typeof muscleRoles)[number];
export type BodyRegion = (typeof bodyRegions)[number];
export type Measure = (typeof measures)[number];
export type LoadMode = (typeof loadModes)[number];
export type GripType = (typeof gripTypes)[number];
export type FingerCount = (typeof fingerCounts)[number];
export type Side = (typeof sides)[number];
export type EnrollmentStatus = (typeof enrollmentStatuses)[number];
export type SetResult = (typeof setResults)[number];
