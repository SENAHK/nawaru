import type { Category, DosageScheme, EffortScale, FingerCount, GripType, Measure } from '@/db/enums';

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

export const gripTypeLabels: Record<GripType, string> = {
  half_crimp: 'Half crimp',
  full_crimp: 'Full crimp',
  open_drag: 'Open drag',
  pocket: 'Pocket',
  pinch: 'Pinch',
  sloper: 'Sloper',
};

export const fingerCountLabels: Record<FingerCount, string> = {
  four: '4 fingers',
  three_front: '3 front',
  three_back: '3 back',
  two_front: '2 front',
  two_middle: '2 middle',
  two_back: '2 back',
  mono: 'Mono',
};
