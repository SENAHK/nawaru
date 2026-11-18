// Progress calculations (docs/screens.md S12). Pure.

import type { FingerCount, GripType } from '@/db/enums';
import type { SessionStatus } from '@/features/schedule/schedule';
import { addDays, mondayOf } from '@/lib/dates';
import { formatGrip } from '@/lib/format';

/** A max hang combination: grip × edge × hold duration. */
export type HangCombo = {
  gripType: GripType | null;
  fingerCount: FingerCount | null;
  edgeMm: number | null;
  durationS: number | null;
};

export const comboKey = (combo: HangCombo) =>
  [combo.gripType, combo.fingerCount, combo.edgeMm, combo.durationS].map((value) => value ?? '-').join('|');

/** "20 mm · 4F HC · 10s". */
export function formatCombo(combo: HangCombo): string {
  return [
    combo.edgeMm != null ? `${combo.edgeMm} mm` : null,
    formatGrip(combo) || null,
    combo.durationS != null ? `${combo.durationS}s` : null,
  ]
    .filter(Boolean)
    .join(' · ') || 'Any grip';
}

export type Point = { date: string; kg: number };

/** Heaviest successful load per day, oldest first. */
export function bestPerDay(sets: Point[]): Point[] {
  const best = new Map<string, number>();
  for (const set of sets) best.set(set.date, Math.max(best.get(set.date) ?? -Infinity, set.kg));
  return [...best.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, kg]) => ({ date, kg }));
}

const WINDOW_DAYS = 8 * 7;

export type HangSummary = {
  best: Point | null;
  /** Change over the last 8 weeks: latest point minus the first one in the window. */
  change: number | null;
};

export function summarize(points: Point[], today: string): HangSummary {
  const best = points.reduce<Point | null>((top, point) => (!top || point.kg > top.kg ? point : top), null);
  const recent = points.filter((point) => point.date > addDays(today, -WINDOW_DAYS) && point.date <= today);
  const change = recent.length >= 2 ? Math.round((recent.at(-1)!.kg - recent[0].kg) * 10) / 10 : null;
  return { best, change };
}

/** Total load hung as a % of bodyweight: (bodyweight + added) / bodyweight. */
export function percentOfBodyweight(addedKg: number, bodyweightKg: number): number {
  return Math.round(((bodyweightKg + addedKg) / bodyweightKg) * 100);
}

export type WeekConsistency = { monday: string; done: number; planned: number };

/** Sessions done / planned for each of the last `weeks` weeks, oldest first. */
export function weeklyConsistency(
  sessions: { scheduledDate: string; status: SessionStatus }[],
  today: string,
  weeks = 8,
): WeekConsistency[] {
  const thisMonday = mondayOf(today);
  return Array.from({ length: weeks }, (_, index) => {
    const monday = addDays(thisMonday, (index - weeks + 1) * 7);
    const inWeek = sessions.filter(
      (session) => session.scheduledDate >= monday && session.scheduledDate <= addDays(monday, 6),
    );
    return {
      monday,
      done: inWeek.filter((session) => session.status === 'done').length,
      planned: inWeek.length,
    };
  });
}

/** Id of the record: the heaviest best load, the first time it was reached. */
export function personalRecordId(entries: { id: string; date: string; bestKg: number | null }[]): string | null {
  let record: { id: string; date: string; bestKg: number } | null = null;
  for (const entry of entries) {
    if (entry.bestKg == null) continue;
    if (!record || entry.bestKg > record.bestKg || (entry.bestKg === record.bestKg && entry.date < record.date)) {
      record = { id: entry.id, date: entry.date, bestKg: entry.bestKg };
    }
  }
  return record?.id ?? null;
}
