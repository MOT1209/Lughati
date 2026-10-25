import { goalRingGeometry } from './goalRingGeometry';

describe('goalRingGeometry', () => {
  it('is empty at 0 minutes and full at the goal', () => {
    const empty = goalRingGeometry(0, 20, false);
    expect(empty.ratio).toBe(0);
    expect(empty.dashOffset).toBeCloseTo(empty.circumference);
    const full = goalRingGeometry(20, 20, false);
    expect(full.ratio).toBe(1);
    expect(full.dashOffset).toBe(0);
    expect(full.reached).toBe(true);
  });

  it('clamps over-goal and negative values', () => {
    expect(goalRingGeometry(50, 20, false).percent).toBe(100);
    expect(goalRingGeometry(-5, 20, false).percent).toBe(0);
  });

  it('treats a missing goal or NaN as 0%', () => {
    expect(goalRingGeometry(10, 0, false)).toMatchObject({ ratio: 0, reached: false });
    expect(goalRingGeometry(NaN, 20, false).ratio).toBe(0);
  });

  it('rounds the percent', () => {
    expect(goalRingGeometry(1, 3, false).percent).toBe(33);
  });

  it('mirrors the ring only in RTL', () => {
    expect(goalRingGeometry(5, 20, false).transform).toEqual([{ rotate: '-90deg' }]);
    expect(goalRingGeometry(5, 20, true).transform).toEqual([{ rotate: '-90deg' }, { scaleY: -1 }]);
  });
});
