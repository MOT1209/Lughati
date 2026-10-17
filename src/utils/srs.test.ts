import type { VocabularyReviewState } from '@/types';

import { initialReviewState, intervalForStep, scheduleReview, SRS_INTERVAL_DAYS } from './srs';

const NOW = new Date('2026-10-15T12:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;

const stateWith = (step: number): Pick<VocabularyReviewState, 'step'> => ({ step });

describe('SRS interval ladder', () => {
  it('matches the documented ladder and clamps out-of-range steps', () => {
    expect(SRS_INTERVAL_DAYS).toEqual([1, 3, 7, 14, 30, 90]);
    expect(intervalForStep(0)).toBe(1 * DAY);
    expect(intervalForStep(5)).toBe(90 * DAY);
    expect(intervalForStep(-3)).toBe(1 * DAY); // clamped low
    expect(intervalForStep(99)).toBe(90 * DAY); // clamped high
  });
});

describe('initialReviewState', () => {
  it('starts a newly learned word at step 0, due one day later', () => {
    expect(initialReviewState(NOW)).toEqual({ step: 0, nextReviewAt: '2026-10-16T12:00:00.000Z' });
  });
});

describe('scheduleReview', () => {
  it('starts a new word at step 0 one day out', () => {
    expect(scheduleReview(null, 'good', NOW)).toEqual({ step: 1, nextReviewAt: '2026-10-16T12:00:00.000Z' });
  });

  it('advances one rung on "good"', () => {
    expect(scheduleReview(stateWith(2), 'good', NOW)).toEqual({ step: 3, nextReviewAt: '2026-10-22T12:00:00.000Z' });
  });

  it('jumps to the next rung on "easy" and takes the new rung\u2019s interval', () => {
    // easy from step 2 -> step 3, interval of rung 3 = 14 days (a small jump ahead of "good").
    expect(scheduleReview(stateWith(2), 'easy', NOW)).toEqual({ step: 3, nextReviewAt: '2026-10-29T12:00:00.000Z' });
  });

  it('drops one rung on "difficult" and never goes below step 0', () => {
    expect(scheduleReview(stateWith(3), 'difficult', NOW)).toEqual({ step: 2, nextReviewAt: '2026-10-22T12:00:00.000Z' });
    expect(scheduleReview(stateWith(0), 'difficult', NOW)).toEqual({ step: 0, nextReviewAt: '2026-10-16T12:00:00.000Z' });
  });

  it('resets to step 0 and is due immediately on "again"', () => {
    expect(scheduleReview(stateWith(4), 'again', NOW)).toEqual({ step: 0, nextReviewAt: '2026-10-15T12:00:00.000Z' });
  });

  it('never schedules past the last rung of the ladder', () => {
    const top = scheduleReview(stateWith(5), 'easy', NOW);
    expect(top.step).toBe(5);
    expect(new Date(top.nextReviewAt).getTime() - NOW.getTime()).toBe(90 * DAY);
  });

  it('is deterministic: same input and time, same output', () => {
    expect(scheduleReview(stateWith(2), 'good', NOW)).toEqual(scheduleReview(stateWith(2), 'good', NOW));
  });
});
