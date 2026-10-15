/**
 * Streaks computed from real activity history only — no fabricated days. Input is the set of
 * local-calendar-day strings (YYYY-MM-DD) on which activity was recorded for one user, plus the
 * local calendar day treated as "today".
 *
 *  - current streak: consecutive activity days counting back from today; today without activity
 *    does not break it while yesterday is still active, but two empty days in a row do.
 *  - best streak: the longest consecutive run ever seen in the history.
 */

export interface StreakStats {
  current: number;
  best: number;
}

const ONE_DAY = 24 * 60 * 60 * 1000;

/** Walks back one calendar day, keeping the YYYY-MM-DD form (works across month boundaries). */
export function previousDay(day: string): string {
  const date = new Date(`${day}T00:00:00Z`);
  return new Date(date.getTime() - ONE_DAY).toISOString().slice(0, 10);
}

export function computeStreakStats(activityDays: readonly string[], today: string): StreakStats {
  const active = new Set(activityDays);
  const sorted = [...active].sort();

  let best = 0;
  let run = 0;
  let previous: string | null = null;
  for (const day of sorted) {
    run = previous !== null && previousDay(day) === previous ? run + 1 : 1;
    previous = day;
    best = Math.max(best, run);
  }

  // Current streak: today and/or yesterday anchor, then consecutive days back to anchor.
  let current = 0;
  if (active.has(today)) {
    current = 1;
    let cursor = today;
    while (active.has(previousDay(cursor))) {
      cursor = previousDay(cursor);
      current += 1;
    }
  } else if (active.has(previousDay(today))) {
    current = 1;
    let cursor = previousDay(today);
    while (active.has(previousDay(cursor))) {
      cursor = previousDay(cursor);
      current += 1;
    }
  }

  const bestIncludingCurrent = Math.max(best, current);
  return { current, best: bestIncludingCurrent };
}
