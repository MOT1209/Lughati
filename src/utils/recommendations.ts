import type { Lesson, LessonAttempt, LearningPlan, Progress, Recommendation } from '@/types';

import { scoreRatio } from './exercises';
import { PASS_RATIO } from './progression';

/**
 * Transparent, rule-based learning recommendations — no AI, no randomness, no network. Every rule
 * is decided only from data the app actually recorded (progress, attempt history, due vocabulary,
 * the daily plan), so an empty profile produces sensible empty-state behavior rather than noise.
 *
 * Rules, in fixed priority order (highest score first):
 *  1. daily-goal      — recorded minutes today are below the goal.
 *  2. review-due      — at least one vocabulary item is due for review.
 *  3. retry-lesson    — the latest attempt at the current lesson scored below the threshold.
 *  4. continue-lesson — there is a current lesson to continue (this covers new users: their
 *                       "current lesson" is the first lesson of the language).
 *  5. continue-unit   — only when the content actually defines units for the current lesson; the
 *                       rule is inert otherwise so no invented denomination is recommended.
 *
 * Deterministic: identical inputs produce identical output and ordering.
 */

/** A run below the pass mark leaves the lesson unfinished, so that is exactly when to suggest a retry. */
export const RETRY_SCORE_THRESHOLD = PASS_RATIO;

export interface RecommendationInput {
  progress: Progress;
  /** Attempt history for the progress's language, oldest first. */
  attempts: readonly LessonAttempt[];
  /** How many vocabulary items are due right now (0 when the review store is empty). */
  dueVocabulary: number;
  plan: LearningPlan;
  /** Lessons of the same language, when the caller has them; enables the unit rule. */
  lessons?: readonly Lesson[];
}

export function getRecommendations(input: RecommendationInput): Recommendation[] {
  const { progress, attempts, dueVocabulary, plan, lessons } = input;
  const out: Recommendation[] = [];

  const remainingToday = plan.dailyGoalMinutes - plan.minutesToday;
  if (remainingToday > 0) {
    out.push({
      kind: 'daily-goal',
      score: 60,
      params: { minutes: remainingToday },
      reason: `${remainingToday} minutes of today's ${plan.dailyGoalMinutes}-minute goal remain.`,
    });
  }

  if (dueVocabulary > 0) {
    out.push({
      kind: 'review-due',
      score: 50 + Math.min(dueVocabulary, 20),
      params: { count: dueVocabulary },
      reason: `${dueVocabulary} vocabulary item(s) are due for review.`,
    });
  }

  const currentLessonId = progress.currentLessonId;
  const attemptsOfCurrent = currentLessonId ? attempts.filter((a) => a.lessonId === currentLessonId) : [];
  const lastAttempt = attemptsOfCurrent.length > 0 ? attemptsOfCurrent[attemptsOfCurrent.length - 1]! : null;

  if (currentLessonId && lastAttempt && scoreRatio(lastAttempt.result) < RETRY_SCORE_THRESHOLD) {
    out.push({
      kind: 'retry-lesson',
      lessonId: currentLessonId,
      score: 45,
      params: { percent: Math.round(scoreRatio(lastAttempt.result) * 100) },
      reason: `The last run of this lesson scored ${Math.round(scoreRatio(lastAttempt.result) * 100)}%.`,
    });
  }

  if (currentLessonId) {
    out.push({
      kind: 'continue-lesson',
      lessonId: currentLessonId,
      score: 40,
      reason: 'This is the learner\u2019s current unfinished lesson.',
    });
  }

  // Units are optional in the content model; the rule fires only when the current lesson really
  // belongs to a unit, so recommendations never name an organization that does not exist.
  const currentLesson = currentLessonId && lessons ? lessons.find((l) => l.id === currentLessonId) : undefined;
  if (currentLesson?.unitId) {
    out.push({
      kind: 'continue-unit',
      lessonId: currentLesson.id,
      score: 30,
      reason: 'Keep working through the current unit.',
    });
  }

  return out.sort((a, b) => b.score - a.score);
}

/** Small helper content owners can use to expose the unit rule only when real units exist. */
export function hasUnits(lessons: readonly Lesson[]): boolean {
  return lessons.some((l) => typeof l.unitId === 'string' && l.unitId.length > 0);
}
