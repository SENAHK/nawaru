// Which sounds to play between two consecutive timer states (docs/timer.md §4.1).

import { currentStep, nextStep, remainingMs } from './machine';
import type { Cue, TimerState } from './types';

const COUNTDOWN_MS = [3000, 2000, 1000];
const REST_WARNING_MS = 10_000;
const MIN_REST_FOR_WARNING_S = 30;
/** Entering a step this late means the timer was catching up: stay silent. */
const CATCH_UP_MS = 1500;

export function computeCues(
  prev: TimerState,
  next: TimerState,
  prevNow: number,
  now: number,
): Cue[] {
  if (next.status === 'done' && prev.status !== 'done') {
    return now - next.stepStartedAt > CATCH_UP_MS ? [] : ['exercise_done'];
  }
  if (next.status !== 'running') return [];

  const step = currentStep(next);
  if (!step) return [];

  // Resuming from a pause shifts `stepStartedAt` without entering a step.
  const entered =
    prev.stepIndex !== next.stepIndex ||
    (prev.status === 'running' && prev.stepStartedAt !== next.stepStartedAt);
  if (entered && prev.status === 'running') {
    if (now - next.stepStartedAt > CATCH_UP_MS) return [];
    if (step.phase === 'on') return ['go'];
    if (step.phase === 'switch') return ['switch'];
    // A timed effort that ran to its end gets a "stop" beep.
    const left = currentStep(prev);
    const ranOut = prev.stepEndsAt != null && prev.stepEndsAt <= now;
    return left?.phase === 'on' && ranOut ? ['stop'] : [];
  }
  if (entered) return step.phase === 'on' ? ['go'] : [];

  const before = remainingMs(prev, prevNow);
  const after = remainingMs(next, now);
  if (before == null || after == null) return [];
  const crossed = (threshold: number) => before > threshold && after <= threshold;

  const cues: Cue[] = [];
  if (nextStep(next)?.phase === 'on' && COUNTDOWN_MS.some(crossed)) cues.push('tick');
  if (
    step.phase === 'rest' &&
    (step.durationS ?? 0) >= MIN_REST_FOR_WARNING_S &&
    crossed(REST_WARNING_MS)
  ) {
    cues.push('rest_end_warning');
  }
  return cues;
}
