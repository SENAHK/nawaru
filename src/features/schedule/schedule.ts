// Calendar and load rules (docs/data-model.md §6, docs/screens.md §3.1–3.2). Pure.

import type { LoadMode } from '@/db/enums';
import { addDays, diffDays, isoWeekday } from '@/lib/dates';
import { formatAddedLoad } from '@/lib/format';

export type SessionStatus = 'planned' | 'in_progress' | 'done' | 'missed';

/** Real date of a planned session for an enrollment starting on `startDate` (a Monday). */
export function scheduledDate(startDate: string, weekIndex: number, dayOfWeek: number): string {
  return addDays(startDate, (weekIndex - 1) * 7 + (dayOfWeek - 1));
}

export function assertMonday(date: string): void {
  if (isoWeekday(date) !== 1) throw new Error(`${date} is not a Monday`);
}

/** 1-based program week containing `date`; can be < 1 before the start. */
export function programWeekOf(startDate: string, date: string): number {
  return Math.floor(diffDays(startDate, date) / 7) + 1;
}

export type WorkoutProgress = {
  startedAt: number | null;
  endedAt: number | null;
  loggedExercises: number;
};

export function sessionStatus(
  date: string,
  today: string,
  workout: WorkoutProgress | null,
): SessionStatus {
  if (workout) {
    if (workout.startedAt != null && workout.endedAt == null) return 'in_progress';
    if (workout.endedAt != null || workout.loggedExercises > 0) return 'done';
  }
  return date < today ? 'missed' : 'planned';
}

const roundToHalf = (kg: number) => Math.round(kg * 2) / 2;

export type ResolvedLoad = {
  /** Load to pre-fill in the log, in kg; null when unknown. */
  kg: number | null;
  /** Text shown next to the exercise; empty when there is nothing to show. */
  label: string;
};

/**
 * Load shown for a prescription. `referenceKg` is the latest matching test
 * result, `lastKg` the load of the last log with the same parameters.
 */
export function resolveLoad(
  loadMode: LoadMode,
  loadValue: number | null,
  referenceKg: number | null,
  lastKg: number | null,
): ResolvedLoad {
  switch (loadMode) {
    case 'absolute':
      return loadValue == null ? none(lastKg) : { kg: loadValue, label: `${loadValue} kg` };
    case 'added':
      return loadValue == null ? none(lastKg) : { kg: loadValue, label: formatAddedLoad(loadValue) };
    case 'assisted':
      return loadValue == null
        ? none(lastKg)
        : { kg: -Math.abs(loadValue), label: formatAddedLoad(-Math.abs(loadValue)) };
    case 'percent_reference': {
      if (loadValue == null) return none(lastKg);
      if (referenceKg == null) return { kg: null, label: `${loadValue}% ref · no test yet` };
      const kg = roundToHalf((referenceKg * loadValue) / 100);
      return { kg, label: `${formatAddedLoad(kg)} (${loadValue}% ref)` };
    }
    default:
      return none(lastKg);
  }
}

function none(lastKg: number | null): ResolvedLoad {
  return lastKg == null
    ? { kg: null, label: '' }
    : { kg: lastKg, label: `${formatAddedLoad(lastKg)} · last` };
}
