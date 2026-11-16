import { z } from 'zod';

import type { DosageScheme } from './enums';

const count = z.number().int().positive();
const seconds = z.number().int().positive();
const rest = z.number().int().nonnegative().nullish();

/** Dosage columns required by each scheme (docs/data-model.md §7). */
export const dosageSchemas = {
  reps: z.object({ sets: count, reps: count, restBetweenSetsS: rest }),
  isometric: z.object({ sets: count, durationS: seconds, restBetweenSetsS: rest }),
  intervals: z.object({
    sets: count,
    reps: count,
    onS: seconds,
    offS: seconds,
    restBetweenSetsS: rest,
  }),
  circuit: z.object({ rounds: count, itemsPerRound: count, restBetweenSetsS: rest }),
  slots: z.object({ sets: count, slotDurationS: seconds }),
  free_duration: z.object({ totalDurationS: seconds }),
} as const satisfies Record<DosageScheme, z.ZodType>;

export type Dosage<S extends DosageScheme = DosageScheme> = z.infer<(typeof dosageSchemas)[S]>;

/** Throws if the columns required by `scheme` are missing or invalid. */
export function assertValidDosage(scheme: DosageScheme, values: unknown): void {
  dosageSchemas[scheme].parse(values);
}
