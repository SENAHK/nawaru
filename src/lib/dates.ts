/** Local calendar date as YYYY-MM-DD (docs/data-model.md §1). */
export function toCalendarDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const today = () => toCalendarDate(new Date());

/** Parses a YYYY-MM-DD calendar date at local midnight. */
export function parseCalendarDate(date: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(date: string, days: number): string {
  const value = parseCalendarDate(date);
  value.setDate(value.getDate() + days);
  return toCalendarDate(value);
}

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export function isoWeekday(date: string): number {
  return ((parseCalendarDate(date).getDay() + 6) % 7) + 1;
}

/** The Monday of the week containing `date`. */
export function mondayOf(date: string): string {
  return addDays(date, 1 - isoWeekday(date));
}

/** Whole days from `from` to `to` (negative if `to` is earlier). */
export function diffDays(from: string, to: string): number {
  const ms = parseCalendarDate(to).getTime() - parseCalendarDate(from).getTime();
  return Math.round(ms / 86_400_000);
}

/** First day of the month containing `date`, moved by `months`. */
export function startOfMonth(date: string, months = 0): string {
  const value = parseCalendarDate(date);
  return toCalendarDate(new Date(value.getFullYear(), value.getMonth() + months, 1));
}

/** Last day of the month containing `date`. */
export function endOfMonth(date: string): string {
  return addDays(startOfMonth(date, 1), -1);
}
