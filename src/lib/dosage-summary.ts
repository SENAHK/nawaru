import type { FingerCount, GripType, Side } from '@/db/enums';
import type { TimerDosage } from '@/features/timer/types';

import { formatDuration, formatGrip } from './format';

/** Compact dosage, smallest unit first: "7s:3s × 5 × 6" (docs/design-system.md §10). */
export function dosageSummary(dosage: TimerDosage): string {
  switch (dosage.scheme) {
    case 'reps':
      return `${dosage.reps} × ${dosage.sets}`;
    case 'isometric':
      return `${formatDuration(dosage.durationS ?? 0)} × ${dosage.sets}`;
    case 'intervals':
      return `${dosage.onS}s:${dosage.offS}s × ${dosage.reps} × ${dosage.sets}`;
    case 'circuit':
      return `${dosage.itemsPerRound} × ${dosage.rounds} rounds`;
    case 'slots':
      return `${formatDuration(dosage.slotDurationS ?? 0)} × ${dosage.sets}`;
    case 'free_duration':
      return formatDuration(dosage.totalDurationS ?? 0);
  }
}

/** Dosage with edge and grip: "10s × 5 · 20 mm · 4F HC". */
export function fullDosageSummary(
  dosage: TimerDosage,
  details: { edgeMm: number | null; gripType: GripType | null; fingerCount: FingerCount | null; side: Side | null },
): string {
  return [
    dosageSummary(dosage),
    details.edgeMm != null ? `${details.edgeMm} mm` : null,
    formatGrip(details) || null,
    details.side === 'alternate' ? 'each side' : null,
  ]
    .filter(Boolean)
    .join(' · ');
}
