import type { Step, StepSide, TimerDosage, TimerSettings } from './types';

/** Number of sets, rounds (circuit) or slots the dosage contains. */
export function setCount(dosage: TimerDosage): number {
  switch (dosage.scheme) {
    case 'circuit':
      return dosage.rounds ?? 0;
    case 'free_duration':
      return 1;
    default:
      return dosage.sets ?? 0;
  }
}

/** Same dosage with a different number of sets, rounds or slots. */
export function withSetCount(dosage: TimerDosage, count: number): TimerDosage {
  if (dosage.scheme === 'free_duration') return dosage;
  return dosage.scheme === 'circuit' ? { ...dosage, rounds: count } : { ...dosage, sets: count };
}

/** Sides worked in each set: both hands, one fixed side, or left then right. */
export function sidesOf(dosage: TimerDosage): (StepSide | null)[] {
  if (dosage.side === 'alternate') return ['left', 'right'];
  if (dosage.side === 'left' || dosage.side === 'right') return [dosage.side];
  return [null];
}

/**
 * Turns a dosage into the flat list of timer steps (docs/timer.md §2).
 * Prep once at the start, never a rest after the last set.
 */
export function buildSteps(dosage: TimerDosage, settings: TimerSettings): Step[] {
  const steps: Step[] = [];
  const total = setCount(dosage);
  const sides = sidesOf(dosage);
  const rest = dosage.restBetweenSetsS ?? 0;

  if (settings.prepCountdownS > 0) {
    steps.push({
      phase: 'prep',
      durationS: settings.prepCountdownS,
      setIndex: 0,
      repIndex: null,
      side: null,
    });
  }

  for (let setIndex = 1; setIndex <= total; setIndex++) {
    sides.forEach((side, sideIndex) => {
      steps.push(...effortSteps(dosage, setIndex, side));

      const lastSide = sideIndex === sides.length - 1;
      if (!lastSide && settings.sideSwitchRestS > 0) {
        steps.push({
          phase: 'switch',
          durationS: settings.sideSwitchRestS,
          setIndex,
          repIndex: null,
          side: sides[sideIndex + 1],
        });
      }
    });

    if (setIndex < total && rest > 0 && dosage.scheme !== 'slots') {
      steps.push({ phase: 'rest', durationS: rest, setIndex, repIndex: null, side: null });
    }
  }

  return steps;
}

/** The effort of one set on one side: a single `on`, or the on/off cycle of intervals. */
function effortSteps(dosage: TimerDosage, setIndex: number, side: StepSide | null): Step[] {
  switch (dosage.scheme) {
    case 'reps':
    case 'circuit':
      return [{ phase: 'on', durationS: null, setIndex, repIndex: null, side }];
    case 'isometric':
      return [{ phase: 'on', durationS: dosage.durationS ?? 0, setIndex, repIndex: null, side }];
    case 'slots':
      return [{ phase: 'on', durationS: dosage.slotDurationS ?? 0, setIndex, repIndex: null, side }];
    case 'free_duration':
      return [{ phase: 'on', durationS: dosage.totalDurationS ?? 0, setIndex, repIndex: null, side }];
    case 'intervals': {
      const steps: Step[] = [];
      const reps = dosage.reps ?? 0;
      for (let repIndex = 1; repIndex <= reps; repIndex++) {
        steps.push({ phase: 'on', durationS: dosage.onS ?? 0, setIndex, repIndex, side });
        // The last "off" of a side is replaced by the switch or the rest.
        if (repIndex < reps && (dosage.offS ?? 0) > 0) {
          steps.push({ phase: 'off', durationS: dosage.offS ?? 0, setIndex, repIndex, side });
        }
      }
      return steps;
    }
  }
}

/** Two steps are the same position in the exercise, whatever their index. */
export function sameStep(a: Step, b: Step): boolean {
  return (
    a.phase === b.phase &&
    a.setIndex === b.setIndex &&
    a.repIndex === b.repIndex &&
    a.side === b.side
  );
}
