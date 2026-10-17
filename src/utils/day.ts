/**
 * Local calendar day (device time zone) of a date, `YYYY-MM-DD`: the form activity, study plans and
 * review dates are keyed and shown by. Never `toISOString().slice(0, 10)`, which is the UTC day and
 * is a day off for learners east or west of UTC around midnight.
 */
export function dayOf(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
