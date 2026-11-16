// Timer state machine (docs/timer.md §3). Pure: every function takes the
// current state and wall-clock time and returns the next state.

import { sameStep } from './build-steps';
import type { Step, StepResult, TimerState } from './types';

/** Pressing Back this early in a step goes to the previous step instead of restarting. */
const BACK_TO_PREVIOUS_MS = 2000;

export function currentStep(state: TimerState): Step | null {
  return state.steps[state.stepIndex] ?? null;
}

export function nextStep(state: TimerState): Step | null {
  return state.steps[state.stepIndex + 1] ?? null;
}

const isActive = (state: TimerState) => state.status === 'running' || state.status === 'paused';

/** "Now" as the step sees it: frozen at the pause instant while paused. */
const clock = (state: TimerState, now: number) => state.pausedAt ?? now;

/** Ms left in a timed step, null on a manual step. */
export function remainingMs(state: TimerState, now: number): number | null {
  if (state.stepEndsAt == null) return null;
  return Math.max(0, state.stepEndsAt - clock(state, now));
}

/** Ms spent in the current step. */
export function elapsedMs(state: TimerState, now: number): number {
  return Math.max(0, clock(state, now) - state.stepStartedAt);
}

/** 0..1 progress of a timed step, null on a manual step. */
export function progress(state: TimerState, now: number): number | null {
  if (state.stepDurationMs == null || state.stepDurationMs === 0) return null;
  return Math.min(1, elapsedMs(state, now) / state.stepDurationMs);
}

function enterStep(state: TimerState, stepIndex: number, at: number): TimerState {
  const step = state.steps[stepIndex];
  if (!step) {
    return {
      ...state,
      stepIndex: state.steps.length,
      status: 'done',
      stepStartedAt: at,
      stepEndsAt: null,
      stepDurationMs: null,
      pausedAt: null,
    };
  }
  const durationMs = step.durationS == null ? null : step.durationS * 1000;
  return {
    ...state,
    stepIndex,
    stepStartedAt: at,
    stepEndsAt: durationMs == null ? null : at + durationMs,
    stepDurationMs: durationMs,
    // A paused timer stays paused on the new step.
    pausedAt: state.status === 'paused' ? at : null,
  };
}

const sameResult = (result: StepResult, step: Step) =>
  result.setIndex === step.setIndex && result.repIndex === step.repIndex && result.side === step.side;

/** Records what happened on the current step if it is an effort step. */
function closeStep(state: TimerState, completed: boolean, at: number): TimerState {
  const step = currentStep(state);
  if (!step || step.phase !== 'on') return state;

  const elapsedS =
    completed && step.durationS != null
      ? step.durationS
      : Math.max(0, Math.round((at - state.stepStartedAt) / 1000));
  const result: StepResult = {
    setIndex: step.setIndex,
    repIndex: step.repIndex,
    side: step.side,
    completed,
    elapsedS,
  };
  return { ...state, results: [...state.results.filter((r) => !sameResult(r, step)), result] };
}

export function start(steps: Step[], now: number): TimerState {
  const initial: TimerState = {
    steps,
    stepIndex: 0,
    status: 'running',
    stepStartedAt: now,
    stepEndsAt: null,
    stepDurationMs: null,
    pausedAt: null,
    results: [],
  };
  return enterStep(initial, 0, now);
}

/**
 * Advances through every timed step that has ended by `now`. Each next step
 * starts at the theoretical end of the previous one, so a late tick (or a
 * suspended app) never makes the timer drift.
 */
export function tick(state: TimerState, now: number): TimerState {
  let next = state;
  while (next.status === 'running' && next.stepEndsAt != null && next.stepEndsAt <= now) {
    const endedAt = next.stepEndsAt;
    next = enterStep(closeStep(next, true, endedAt), next.stepIndex + 1, endedAt);
  }
  return next;
}

/** Ends a manual step ("Set done", "Round done"). */
export function completeManual(state: TimerState, now: number): TimerState {
  const step = currentStep(state);
  if (state.status !== 'running' || !step || step.durationS != null) return state;
  return enterStep(closeStep(state, true, now), state.stepIndex + 1, now);
}

export function pause(state: TimerState, now: number): TimerState {
  if (state.status !== 'running') return state;
  return { ...state, status: 'paused', pausedAt: now };
}

export function resume(state: TimerState, now: number): TimerState {
  if (state.status !== 'paused' || state.pausedAt == null) return state;
  const shift = now - state.pausedAt;
  return {
    ...state,
    status: 'running',
    pausedAt: null,
    stepStartedAt: state.stepStartedAt + shift,
    stepEndsAt: state.stepEndsAt == null ? null : state.stepEndsAt + shift,
  };
}

/** Leaves the current step early. A skipped effort step counts as not completed. */
export function skip(state: TimerState, now: number): TimerState {
  if (!isActive(state)) return state;
  const at = clock(state, now);
  return enterStep(closeStep(state, false, at), state.stepIndex + 1, now);
}

/** Restarts the current step, or goes to the previous one when pressed early. */
export function back(state: TimerState, now: number): TimerState {
  if (!isActive(state)) return state;
  const early = elapsedMs(state, now) < BACK_TO_PREVIOUS_MS;
  const targetIndex = early && state.stepIndex > 0 ? state.stepIndex - 1 : state.stepIndex;
  const target = state.steps[targetIndex];
  // The step being replayed loses the result it had recorded.
  const results = state.results.filter((result) => !sameResult(result, target));
  return enterStep({ ...state, results }, targetIndex, now);
}

/** "+30s": extends the current rest. */
export function addRest(state: TimerState, seconds: number): TimerState {
  const step = currentStep(state);
  if (!isActive(state) || step?.phase !== 'rest' || state.stepEndsAt == null) return state;
  return {
    ...state,
    stepEndsAt: state.stepEndsAt + seconds * 1000,
    stepDurationMs: (state.stepDurationMs ?? 0) + seconds * 1000,
  };
}

export function stop(state: TimerState, now: number): TimerState {
  if (!isActive(state)) return state;
  const closed = closeStep(state, false, clock(state, now));
  return { ...closed, status: 'stopped', pausedAt: null };
}

/**
 * Swaps the step list after "Skip set" / "Add set". The timer stays on the
 * same position; if that position no longer exists (the rest after what is
 * now the last set), the exercise is done.
 */
export function replaceSteps(state: TimerState, steps: Step[], now: number): TimerState {
  if (!isActive(state)) return state;
  const step = currentStep(state);
  const stepIndex = step ? steps.findIndex((candidate) => sameStep(candidate, step)) : -1;
  if (stepIndex === -1) return enterStep({ ...state, steps }, steps.length, clock(state, now));
  return { ...state, steps, stepIndex };
}
