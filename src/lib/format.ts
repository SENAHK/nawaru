// Display formats from docs/design-system.md §10.

import type { FingerCount, GripType, Side } from '@/db/enums';

const dateFormat = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

/** "Mon 12 Jan" from a Date or a YYYY-MM-DD calendar date. */
export function formatDate(date: Date | string): string {
  const value = typeof date === 'string' ? new Date(`${date}T00:00:00`) : date;
  return dateFormat.format(value).replace(',', '');
}

const MINUS = '−';

/** "+12.5 kg", "−10 kg", or "BW" when the added load is zero. Kilograms only for now. */
export function formatAddedLoad(kg: number): string {
  if (kg === 0) return 'BW';
  return `${kg > 0 ? '+' : MINUS}${Math.abs(kg)} kg`;
}

const fingerLabels: Record<FingerCount, string> = {
  four: '4F',
  three_front: '3F',
  three_back: '3FB',
  two_front: '2FF',
  two_middle: '2FM',
  two_back: '2FB',
  mono: 'Mono',
};

const gripLabels: Record<GripType, string> = {
  half_crimp: 'HC',
  full_crimp: 'FC',
  open_drag: 'Drag',
  pocket: 'Pocket',
  pinch: 'Pinch',
  sloper: 'Sloper',
};

/** Compact grip summary: "4F HC", "3F Drag", "L 2FM Pocket". */
export function formatGrip(grip: {
  gripType: GripType | null;
  fingerCount: FingerCount | null;
  side?: Side | null;
}): string {
  const side = grip.side === 'left' ? 'L' : grip.side === 'right' ? 'R' : null;
  return [
    side,
    grip.fingerCount ? fingerLabels[grip.fingerCount] : null,
    grip.gripType ? gripLabels[grip.gripType] : null,
  ]
    .filter(Boolean)
    .join(' ');
}
