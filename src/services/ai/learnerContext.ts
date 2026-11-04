import type { Lesson, LessonAttempt, LanguageCode, LearningPlan, Progress, Streak } from '@/types';
import { PASS_RATIO } from '@/utils/progression';

import type { AIContext, PlannerStats } from './types';

/**
 * The learner context sent with every AI request: languages, level and a few hints. It carries no
 * name, e-mail, user id or history, so the model can only know what is stated here.
 */
export function buildAIContext(input: { learning: LanguageCode; explanation: LanguageCode; level: string; weakTopics?: string[]; goal?: string }): AIContext {
  return {
    learningLanguage: input.learning,
    explanationLanguage: input.explanation,
    level: input.level,
    ...(input.weakTopics?.length ? { weakTopics: input.weakTopics.slice(0, 5) } : {}),
    ...(input.goal ? { goal: input.goal.slice(0, 120) } : {}),
  };
}

/** Lessons where the learner's best lesson run is below the pass mark, weakest first (English lesson titles). */
export function weakTopicsFrom(attempts: readonly LessonAttempt[], lessons: readonly Lesson[], max = 5): string[] {
  const best = new Map<string, number>();
  for (const a of attempts) {
    if (a.kind === 'practice' || a.result.total === 0) continue;
    const ratio = a.result.correct / a.result.total;
    best.set(a.lessonId, Math.max(best.get(a.lessonId) ?? 0, ratio));
  }
  const titleOf = new Map(lessons.map((l) => [l.id, l.title.en]));
  return [...best.entries()]
    .filter(([, ratio]) => ratio < PASS_RATIO)
    .sort((x, y) => x[1] - y[1])
    .map(([id]) => titleOf.get(id))
    .filter((t): t is string => !!t)
    .slice(0, max);
}

/** Plain statistics computed by normal app logic: the model only interprets them, it never calculates them. */
export function buildPlannerStats(input: {
  progress: Progress | null;
  plan: LearningPlan;
  streak: Streak;
  attempts: readonly LessonAttempt[];
  lessons: readonly Lesson[];
  dueReviews: number;
}): PlannerStats {
  const runs = input.attempts.filter((a) => a.kind !== 'practice' && a.result.total > 0);
  const total = runs.reduce((n, a) => n + a.result.total, 0);
  const correct = runs.reduce((n, a) => n + a.result.correct, 0);
  return {
    completedLessons: input.progress?.completedLessonIds.length ?? 0,
    totalLessons: input.lessons.length,
    accuracyPercent: total > 0 ? Math.round((correct / total) * 100) : null,
    streakDays: input.streak.days,
    dueReviews: input.dueReviews,
    minutesToday: input.plan.minutesToday,
    dailyGoalMinutes: input.plan.dailyGoalMinutes,
    weakTopics: weakTopicsFrom(input.attempts, input.lessons),
  };
}

export type LocalAdvice =
  | { kind: 'start' }
  | { kind: 'on-track' }
  | { kind: 'review-due'; count: number }
  | { kind: 'daily-goal'; minutes: number }
  | { kind: 'weak-topic'; topic: string };

/** Deterministic advice with no model request: the planner screen shows this first, AI is optional. */
export function localAdvice(stats: PlannerStats): LocalAdvice[] {
  const out: LocalAdvice[] = [];
  if (stats.completedLessons === 0 && stats.accuracyPercent === null) out.push({ kind: 'start' });
  if (stats.dueReviews > 0) out.push({ kind: 'review-due', count: stats.dueReviews });
  const remaining = stats.dailyGoalMinutes - stats.minutesToday;
  if (remaining > 0) out.push({ kind: 'daily-goal', minutes: remaining });
  for (const topic of stats.weakTopics.slice(0, 2)) out.push({ kind: 'weak-topic', topic });
  return out.length > 0 ? out : [{ kind: 'on-track' }];
}
