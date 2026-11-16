import type { DosageScheme, Side } from '@/db/enums';

export type Phase = 'prep' | 'on' | 'off' | 'rest' | 'switch';
export type StepSide = 'left' | 'right';

export type Step = {
  phase: Phase;
  /** Seconds; null for a manual step (count-up, ended by a button). */
  durationS: number | null;
  /** 1-based set, round (circuit) or slot number; 0 for the prep step. */
  setIndex: number;
  /** 1-based rep number, intervals only. */
  repIndex: number | null;
  side: StepSide | null;
};

/** The dosage the timer runs: the dosage columns plus the scheme and side. */
export type TimerDosage = {
  scheme: DosageScheme;
  side: Side | null;
  sets?: number | null;
  reps?: number | null;
  durationS?: number | null;
  onS?: number | null;
  offS?: number | null;
  restBetweenSetsS?: number | null;
  rounds?: number | null;
  itemsPerRound?: number | null;
  slotDurationS?: number | null;
  totalDurationS?: number | null;
};

export type TimerSettings = {
  prepCountdownS: number;
  sideSwitchRestS: number;
};

/** What happened on one effort (`on`) step. */
export type StepResult = {
  setIndex: number;
  repIndex: number | null;
  side: StepSide | null;
  /** False when skipped or stopped before the end. */
  completed: boolean;
  elapsedS: number;
};

export type TimerStatus = 'running' | 'paused' | 'done' | 'stopped';

export type TimerState = {
  steps: Step[];
  stepIndex: number;
  status: TimerStatus;
  /** Epoch ms. */
  stepStartedAt: number;
  /** Epoch ms; null on a manual step. */
  stepEndsAt: number | null;
  /** Current length of the step in ms (grows with "+30s"); null on a manual step. */
  stepDurationMs: number | null;
  /** Epoch ms while paused. */
  pausedAt: number | null;
  results: StepResult[];
};

export type Cue = 'tick' | 'go' | 'stop' | 'switch' | 'rest_end_warning' | 'exercise_done';
