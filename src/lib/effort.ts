import type { EffortScale } from '@/db/enums';

const feelLabels = ['Easy', 'Moderate', 'Hard', 'Very hard', 'Max'];

/** Values offered for an effort scale (docs/design-system.md, EffortPicker). */
export function effortValues(scale: EffortScale): number[] {
  switch (scale) {
    case 'rpe':
      return Array.from({ length: 19 }, (_, index) => 1 + index / 2);
    case 'rir':
      return [0, 1, 2, 3, 4, 5];
    case 'feel':
      return [1, 2, 3, 4, 5];
  }
}

/** "RPE 8.5", "2 RIR", "Hard". Feel is stored as 1 (Easy) to 5 (Max). */
export function formatEffort(scale: EffortScale, value: number): string {
  switch (scale) {
    case 'rpe':
      return String(value);
    case 'rir':
      return String(value);
    case 'feel':
      return feelLabels[value - 1] ?? String(value);
  }
}

export const effortTitles: Record<EffortScale, string> = {
  rpe: 'Effort (RPE)',
  rir: 'Reps in reserve',
  feel: 'Feel',
};
