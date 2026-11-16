// The running exercise session: log rows, timer state, wall-clock loop,
// sounds and persistence (docs/timer.md §3.3 and §5).

import * as Haptics from 'expo-haptics';
import { useSyncExternalStore } from 'react';

import {
  clearActiveTimer,
  loadLogSession,
  readActiveTimer,
  saveLogRows,
  setTimerSoundsEnabled,
  writeActiveTimer,
  type LogSessionData,
} from '@/db/queries/log';

import { loadSounds, playCue, unloadSounds } from './audio';
import { buildSteps, setCount, withSetCount } from './build-steps';
import { computeCues } from './cues';
import * as machine from './machine';
import { back, completeManual, pause, resume, skip, stop } from './machine';
import {
  addSetRows,
  applyTimerResults,
  buildPlannedRows,
  removeLastSetRows,
  type LogRow,
} from './rows';
import type { TimerDosage, TimerState } from './types';

const TICK_MS = 100;
const DONE_SOUND_GRACE_MS = 1500;

export type Session = Omit<LogSessionData, 'savedSets'> & {
  rows: LogRow[];
  timer: TimerState | null;
};

let session: Session | null = null;
let interval: ReturnType<typeof setInterval> | null = null;
let lastTickAt = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useSession(): Session | null {
  return useSyncExternalStore(subscribe, () => session);
}

export const getSession = () => session;

const isActive = (timer: TimerState | null) =>
  timer?.status === 'running' || timer?.status === 'paused';

function rowsFromSaved(data: LogSessionData): LogRow[] {
  if (data.savedSets.length === 0) return buildPlannedRows(data.dosage, data.targetLoadKg);
  return data.savedSets.map((set) => ({
    key: set.id,
    setIndex: set.setIndex,
    itemIndex: set.itemIndex,
    side: set.side,
    reps: set.repsDone,
    durationS: set.durationS,
    loadKg: set.loadKg,
    result: set.result,
    done: true,
    edited: true,
  }));
}

/** Opens the session for an exercise log, reusing the running one if it is the same. */
export function openSession(exerciseLogId: string): Session | null {
  if (session?.exerciseLogId === exerciseLogId) return session;
  const data = loadLogSession(exerciseLogId);
  if (!data) return null;
  const { savedSets: _savedSets, ...rest } = data;
  session = { ...rest, rows: rowsFromSaved(data), timer: null };
  emit();
  return session;
}

/** Restores a timer that was running when the app was closed. Call once at launch. */
export function restoreSession(): void {
  const stored = readActiveTimer();
  if (!stored || session) return;
  try {
    session = JSON.parse(stored.stateJson) as Session;
  } catch {
    clearActiveTimer();
    return;
  }
  if (session.timer?.status === 'running') {
    // Catch up silently on everything that elapsed while the app was closed.
    commitTimer(machine.tick(session.timer, Date.now()), { silent: true });
    startLoop();
  }
  emit();
}

function persist() {
  if (!session) return;
  if (session.timer) writeActiveTimer(session.exerciseLogId, JSON.stringify(session));
}

function startLoop() {
  if (interval || !session) return;
  if (session.settings.soundsEnabled) loadSounds(session.settings.volume);
  lastTickAt = Date.now();
  interval = setInterval(onTick, TICK_MS);
}

function stopLoop() {
  if (interval) clearInterval(interval);
  interval = null;
}

function onTick() {
  const timer = session?.timer;
  if (!timer || timer.status !== 'running') return stopLoop();
  const now = Date.now();
  const next = machine.tick(timer, now);
  commitTimer(next, { prevNow: lastTickAt, now });
  lastTickAt = now;
}

/** Applies a new timer state: sounds, haptics, log rows, persistence. */
function commitTimer(
  next: TimerState,
  options: { silent?: boolean; prevNow?: number; now?: number } = {},
) {
  if (!session) return;
  const prev = session.timer;
  const now = options.now ?? Date.now();

  if (prev && !options.silent) {
    const cues = computeCues(prev, next, options.prevNow ?? now, now);
    if (session.settings.soundsEnabled) cues.forEach(playCue);
    if (session.settings.hapticsEnabled && prev.stepIndex !== next.stepIndex) {
      if (next.status === 'done') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } else if (next.status === 'running') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      }
    }
  }

  const changed =
    !prev ||
    prev.stepIndex !== next.stepIndex ||
    prev.status !== next.status ||
    prev.stepEndsAt !== next.stepEndsAt ||
    prev.stepStartedAt !== next.stepStartedAt ||
    prev.steps !== next.steps;
  if (!changed) return;

  session = {
    ...session,
    timer: next,
    rows: applyTimerResults(session.rows, session.dosage, next.results, next.status === 'stopped'),
  };
  persist();
  emit();

  if (next.status === 'running') startLoop();
  else stopLoop();
  if (next.status === 'done' || next.status === 'stopped') {
    // Let the final sound play before releasing the players.
    setTimeout(() => !interval && unloadSounds(), DONE_SOUND_GRACE_MS);
  }
}

export function startTimer(): void {
  if (!session || isActive(session.timer)) return;
  const steps = buildSteps(session.dosage, session.settings);
  if (steps.length === 0) return;
  const now = Date.now();
  if (session.settings.soundsEnabled) loadSounds(session.settings.volume);
  commitTimer(machine.start(steps, now), { silent: true });
  if (steps[0].phase === 'on' && session.settings.soundsEnabled) playCue('go');
}

const transitions = { pause, resume, skip, back, completeManual, stop };

type TimerAction = keyof typeof transitions | 'addRest';

export function dispatch(action: TimerAction): void {
  const timer = session?.timer;
  if (!timer) return;
  const now = Date.now();
  // Bring the timer up to date before applying the action.
  const current = machine.tick(timer, now);
  const next =
    action === 'addRest' ? machine.addRest(current, 30) : transitions[action](current, now);
  commitTimer(next, { prevNow: now, now });
}

export function editRow(key: string, values: Partial<Pick<LogRow, 'reps' | 'durationS' | 'loadKg' | 'result'>>): void {
  if (!session) return;
  session = {
    ...session,
    rows: session.rows.map((row) => (row.key === key ? { ...row, ...values, edited: true } : row)),
  };
  persist();
  emit();
}

function changeSetCount(rows: LogRow[], dosage: TimerDosage) {
  if (!session) return;
  const timer = session.timer;
  session = { ...session, rows, dosage };
  if (timer && isActive(timer)) {
    const now = Date.now();
    commitTimer(machine.replaceSteps(timer, buildSteps(dosage, session.settings), now), {
      prevNow: now,
      now,
    });
  }
  persist();
  emit();
}

export function addSet(): void {
  if (!session || session.dosage.scheme === 'free_duration') return;
  const { dosage, rows, targetLoadKg } = session;
  const lastLoad = rows.at(-1)?.loadKg ?? targetLoadKg;
  changeSetCount(addSetRows(rows, dosage, lastLoad), withSetCount(dosage, setCount(dosage) + 1));
}

/** Removes the last upcoming set. Returns false when there is nothing to skip. */
export function skipLastSet(): boolean {
  if (!session) return false;
  const rows = removeLastSetRows(session.rows);
  if (!rows) return false;
  changeSetCount(rows, withSetCount(session.dosage, setCount(session.dosage) - 1));
  return true;
}

export function toggleSounds(): void {
  if (!session) return;
  const soundsEnabled = !session.settings.soundsEnabled;
  session = { ...session, settings: { ...session.settings, soundsEnabled } };
  setTimerSoundsEnabled(soundsEnabled);
  if (soundsEnabled && session.timer?.status === 'running') loadSounds(session.settings.volume);
  persist();
  emit();
}

/** Writes the rows to the database and closes the session. */
export function saveSession(): void {
  if (!session) return;
  if (isActive(session.timer)) dispatch('stop');
  saveLogRows(session.exerciseLogId, session.rows);
  closeSession();
}

/** Drops the session without saving (the exercise log itself stays). */
export function closeSession(): void {
  stopLoop();
  unloadSounds();
  clearActiveTimer();
  session = null;
  emit();
}
