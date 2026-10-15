import type { ReviewOutcome, VocabularyReviewState } from '@/types';

/**
 * The one spaced-repetition scheduler in the app. Screens never schedule on their own: they read
 * `nextReviewAt`/`step` from the vocabulary review repository and call `scheduleReview`.
 *
 * Algorithm (deliberately simple, deterministic, day based):
 *  - intervals ladder in days: 1, 3, 7, 14, 30, 90. A word's `step` is its 0-based index on it.
 *  - a first review starts the word at step 0; the first gap is 1 day.
 *  - 'again'      -> back to step 0, due immediately (step never below 0).
 *  - 'difficult'  -> drop one rung and use that rung's interval (relearn).
 *  - 'good'       -> use the current rung's interval, then advance one rung.
 *  - 'easy'       -> advance one rung first and use the *next* rung's interval (a small jump).
 * The ladder never extends beyond its last rung (90 days).
 *
 * Known limitations, kept honest: no ease factor, no learner-specific customization, no intraday
 * spacing beyond the immediate 'again', and no claim of scientific effectiveness. It is a study
 * schedule, nothing more. Change it only here so intervals never diverge between screens.
 */

export const SRS_INTERVAL_DAYS = [1, 3, 7, 14, 30, 90] as const;

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MAX_STEP = SRS_INTERVAL_DAYS.length - 1;

/** Interval in ms for a (possibly out-of-range) step. Never negative or out of the ladder. */
export function intervalForStep(step: number): number {
  const safe = Math.min(Math.max(Math.trunc(step), 0), MAX_STEP);
  return SRS_INTERVAL_DAYS[safe] * MS_PER_DAY;
}

const iso = (date: Date) => date.toISOString();

/** One state advanced by one outcome. `now` defaults to the current time (injectable in tests). */
export function scheduleReview(
  state: Pick<VocabularyReviewState, 'step'> | null,
  outcome: ReviewOutcome,
  now: Date = new Date(),
): Pick<VocabularyReviewState, 'step' | 'nextReviewAt'> {
  const prevStep = state ? Math.min(Math.max(Math.trunc(state.step), 0), MAX_STEP) : 0;

  let nextStep = prevStep;
  let intervalMs: number;

  switch (outcome) {
    case 'again':
      nextStep = 0;
      intervalMs = 0; // due immediately
      break;
    case 'difficult':
      nextStep = Math.max(prevStep - 1, 0);
      intervalMs = intervalForStep(nextStep);
      break;
    case 'good':
      intervalMs = intervalForStep(prevStep);
      nextStep = Math.min(prevStep + 1, MAX_STEP);
      break;
    case 'easy':
      nextStep = Math.min(prevStep + 1, MAX_STEP);
      intervalMs = intervalForStep(nextStep);
      break;
  }

  return { step: nextStep, nextReviewAt: iso(new Date(now.getTime() + intervalMs)) };
}
