// Rows of the log shown under the timer, and how timer results fill them
// (docs/timer.md §6).

import type { SetResult } from '@/db/enums';

import { setCount, sidesOf } from './build-steps';
import type { StepResult, StepSide, TimerDosage } from './types';

export type LogRow = {
  key: string;
  /** Set, round (circuit) or slot number. */
  setIndex: number;
  /** Climb number inside a circuit round. */
  itemIndex: number | null;
  side: StepSide | null;
  reps: number | null;
  durationS: number | null;
  loadKg: number | null;
  result: SetResult;
  /** Done once the set has been performed (by the timer or by hand). */
  done: boolean;
  /** Values changed by hand are never overwritten by the timer. */
  edited: boolean;
};

const rowKey = (setIndex: number, side: StepSide | null, itemIndex: number | null) =>
  `${setIndex}:${side ?? '-'}:${itemIndex ?? '-'}`;

/** Rows for every planned set, pre-filled with the prescribed values. */
export function buildPlannedRows(dosage: TimerDosage, loadKg: number | null): LogRow[] {
  const rows: LogRow[] = [];
  const sides = sidesOf(dosage);
  const items = dosage.scheme === 'circuit' ? (dosage.itemsPerRound ?? 1) : 1;

  for (let setIndex = 1; setIndex <= setCount(dosage); setIndex++) {
    for (const side of sides) {
      for (let item = 1; item <= items; item++) {
        const itemIndex = dosage.scheme === 'circuit' ? item : null;
        rows.push({
          key: rowKey(setIndex, side, itemIndex),
          setIndex,
          itemIndex,
          side,
          reps: plannedReps(dosage),
          durationS: plannedDuration(dosage),
          loadKg,
          result: 'success',
          done: false,
          edited: false,
        });
      }
    }
  }
  return rows;
}

function plannedReps(dosage: TimerDosage): number | null {
  return dosage.scheme === 'reps' || dosage.scheme === 'intervals' ? (dosage.reps ?? null) : null;
}

function plannedDuration(dosage: TimerDosage): number | null {
  if (dosage.scheme === 'isometric') return dosage.durationS ?? null;
  if (dosage.scheme === 'free_duration') return dosage.totalDurationS ?? null;
  return null;
}

/**
 * Writes the timer results into the rows. With `final` (timer stopped), sets
 * that were never started are dropped.
 */
export function applyTimerResults(
  rows: LogRow[],
  dosage: TimerDosage,
  results: StepResult[],
  final: boolean,
): LogRow[] {
  const lastStartedSet = results.reduce((max, result) => Math.max(max, result.setIndex), 0);

  const updated = rows.map((row): LogRow => {
    const own = results.filter((r) => r.setIndex === row.setIndex && r.side === row.side);
    if (own.length === 0) return row;

    switch (dosage.scheme) {
      case 'intervals': {
        const repsDone = own.filter((r) => r.completed).length;
        const closed = own.length >= (dosage.reps ?? 0) || final || lastStartedSet > row.setIndex;
        const complete = repsDone >= (dosage.reps ?? 0);
        return fill(row, { reps: repsDone, result: complete ? 'success' : 'fail' }, closed);
      }
      case 'isometric':
      case 'free_duration': {
        const [result] = own;
        return fill(
          row,
          { durationS: result.elapsedS, result: result.completed ? 'success' : 'fail' },
          true,
        );
      }
      default:
        // reps, circuit, slots: the set happened; values stay as prescribed.
        return fill(row, { result: own[0].completed ? 'success' : 'fail' }, true);
    }
  });

  return final ? updated.filter((row) => row.done || row.edited) : updated;
}

function fill(row: LogRow, values: Partial<LogRow>, done: boolean): LogRow {
  return row.edited ? { ...row, done: row.done || done } : { ...row, ...values, done };
}

/** Index of the first row that is not done: the set in progress. */
export function currentRowKey(rows: LogRow[]): string | null {
  return rows.find((row) => !row.done)?.key ?? null;
}

/** Adds one set (all its sides / climbs) after the last one. */
export function addSetRows(rows: LogRow[], dosage: TimerDosage, loadKg: number | null): LogRow[] {
  const nextCount = setCount(dosage) + 1;
  const template = buildPlannedRows(
    dosage.scheme === 'circuit' ? { ...dosage, rounds: nextCount } : { ...dosage, sets: nextCount },
    loadKg,
  );
  return [...rows, ...template.filter((row) => row.setIndex === nextCount)];
}

/** Removes the last set if it has not been performed. Returns null if it cannot be removed. */
export function removeLastSetRows(rows: LogRow[]): LogRow[] | null {
  const last = rows.reduce((max, row) => Math.max(max, row.setIndex), 0);
  if (last <= 1) return null;
  if (rows.some((row) => row.setIndex === last && row.done)) return null;
  return rows.filter((row) => row.setIndex !== last);
}
