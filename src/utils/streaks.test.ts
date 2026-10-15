import { computeStreakStats, previousDay } from './streaks';

describe('previousDay', () => {
  it('walks back across month and year boundaries', () => {
    expect(previousDay('2026-03-01')).toBe('2026-02-28');
    expect(previousDay('2026-01-01')).toBe('2025-12-31');
    expect(previousDay('2026-10-15')).toBe('2026-10-14');
  });
});

describe('computeStreakStats', () => {
  it('gives zero for empty history', () => {
    expect(computeStreakStats([], '2026-10-15')).toEqual({ current: 0, best: 0 });
  });

  it('counts today as the anchor of the current streak', () => {
    expect(computeStreakStats(['2026-10-15'], '2026-10-15')).toEqual({ current: 1, best: 1 });
    expect(computeStreakStats(['2026-10-13', '2026-10-14', '2026-10-15'], '2026-10-15')).toEqual({
      current: 3,
      best: 3,
    });
  });

  it('keeps a yesterday-anchored streak alive when today has no activity yet', () => {
    expect(computeStreakStats(['2026-10-13', '2026-10-14'], '2026-10-15')).toEqual({ current: 2, best: 2 });
  });

  it('breaks the current streak after two empty days', () => {
    expect(computeStreakStats(['2026-10-12', '2026-10-13'], '2026-10-15')).toEqual({ current: 0, best: 2 });
  });

  it('finds the best streak even when it is in the past', () => {
    expect(
      computeStreakStats(['2026-09-01', '2026-09-02', '2026-09-03', '2026-10-14', '2026-10-15'], '2026-10-15'),
    ).toEqual({ current: 2, best: 3 });
  });

  it('ignores duplicate day entries', () => {
    expect(computeStreakStats(['2026-10-15', '2026-10-15', '2026-10-15'], '2026-10-15')).toEqual({ current: 1, best: 1 });
  });

  it('handles disjoint single days without inventing runs', () => {
    expect(computeStreakStats(['2026-09-20', '2026-10-01', '2026-10-15'], '2026-10-15')).toEqual({ current: 1, best: 1 });
  });
});
