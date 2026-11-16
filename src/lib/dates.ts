/** Local calendar date as YYYY-MM-DD (docs/data-model.md §1). */
export function toCalendarDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const today = () => toCalendarDate(new Date());
