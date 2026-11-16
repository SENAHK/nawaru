import type { Category, DosageScheme, EffortScale, Measure } from '@/db/enums';

export const categoryLabels: Record<Category, string> = {
  fingers: 'Fingers',
  strength: 'Strength',
  climbing: 'Climbing / Skills',
  mobility: 'Mobility / Flexibility',
  conditioning: 'Conditioning',
  warmup: 'Warm-up',
};

export const schemeLabels: Record<DosageScheme, string> = {
  reps: 'Reps',
  isometric: 'Isometric',
  intervals: 'Intervals',
  circuit: 'Circuit',
  slots: 'Slots',
  free_duration: 'Free duration',
};

export const effortScaleLabels: Record<EffortScale, string> = {
  rpe: 'RPE (1–10)',
  rir: 'RIR (reps in reserve)',
  feel: 'Feel (Easy to Max)',
};

export const measureLabels: Record<Measure, string> = {
  load: 'Load',
  grip: 'Grip',
  edge: 'Edge size',
  grade: 'Grade',
  tempo: 'Tempo',
  range: 'Range of motion',
  effort: 'Effort',
  result: 'Result',
};

export const schemeDescriptions: Record<DosageScheme, string> = {
  reps: 'Sets × reps, with rest between sets.',
  isometric: 'Sets × hold time, with rest between sets.',
  intervals: 'Sets × reps of work / rest cycles, with rest between sets.',
  circuit: 'Rounds of several climbs, with rest between rounds.',
  slots: 'Fixed time slots, one attempt per slot.',
  free_duration: 'One total duration, results logged freely.',
};
