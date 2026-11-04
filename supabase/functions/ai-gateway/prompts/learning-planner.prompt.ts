import { baseRules, JSON_ONLY, type BuiltPrompt } from './common.ts';
import type { LearnerContext, PlannerStats } from '../types.ts';

export function plannerPrompt(ctx: LearnerContext, stats: PlannerStats, horizon: 'daily' | 'weekly'): BuiltPrompt {
  return {
    system: [
      baseRules(ctx),
      `Task: learning planner. The numbers below were computed by the app; do not recalculate them or invent other progress. Write an encouraging ${horizon === 'weekly' ? 'weekly study plan (up to 7 days)' : 'short plan for today'} that fits the daily goal.`,
      JSON_ONLY,
      'Schema: {"summary": string, "dailyTips": string[], "weeklyPlan": [{"day": string, "focus": string, "minutes": number}]} (weeklyPlan may be empty for a daily plan; minutes 5-180)',
    ].join('\n'),
    user: JSON.stringify(stats),
  };
}
