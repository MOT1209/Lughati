export const RING_SIZE = 56;
export const RING_STROKE = 7;
const RADIUS = (RING_SIZE - RING_STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export interface GoalRingGeometry {
  radius: number;
  circumference: number;
  /** Share of the goal reached, clamped to 0..1 (NaN, negative or no goal → 0). */
  ratio: number;
  percent: number;
  dashOffset: number;
  reached: boolean;
  /** Rotate so the arc starts at the top; in RTL also mirror it so it fills the other way. */
  transform: ({ rotate: string } | { scaleY: number })[];
}

export function goalRingGeometry(minutesToday: number, goalMinutes: number, isRTL: boolean): GoalRingGeometry {
  const raw = goalMinutes > 0 ? minutesToday / goalMinutes : 0;
  const ratio = Number.isFinite(raw) ? Math.min(1, Math.max(0, raw)) : 0;
  return {
    radius: RADIUS,
    circumference: CIRCUMFERENCE,
    ratio,
    percent: Math.round(ratio * 100),
    dashOffset: CIRCUMFERENCE * (1 - ratio),
    reached: goalMinutes > 0 && minutesToday >= goalMinutes,
    transform: [{ rotate: '-90deg' }, ...(isRTL ? [{ scaleY: -1 }] : [])],
  };
}
