import type { Category, DosageScheme } from '@/db/enums';

export const categoryLabels: Record<Category, string> = {
  fingers: 'Fingers',
  strength: 'Strength',
  climbing: 'Climbing / Skills',
  mobility: 'Mobility / Flexibility',
  conditioning: 'Conditioning',
  warmup: 'Warm-up',
};

export const schemeLabels: Record<DosageScheme, string> = {
  reps: 'Reps',
  isometric: 'Isometric',
  intervals: 'Intervals',
  circuit: 'Circuit',
  slots: 'Slots',
  free_duration: 'Free duration',
};
