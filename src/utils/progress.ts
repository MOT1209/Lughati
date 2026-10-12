import type { Lesson, Progress } from '@/types';

import { XP_PER_CORRECT_ANSWER } from './answer';

export interface LessonResult {
  correct: number;
  total: number;
}

/**
 * Overlays the learner's locally recorded results on the repository's progress snapshot:
 * completed lessons are merged, XP grows with correct answers, and the current lesson moves
 * to the next unfinished one. Level and level progress are untouched (level-ups are later).
 * `lessons` are the lessons of `progress.targetLanguage`, ordered.
 */
export function applyCompletions(
  progress: Progress,
  lessons: Lesson[],
  results: Record<string, LessonResult>,
): Progress {
  const ownIds = new Set(lessons.map((l) => l.id));
  const finished = Object.keys(results).filter((id) => ownIds.has(id));
  if (finished.length === 0) return progress;

  const completedLessonIds = [...new Set([...progress.completedLessonIds, ...finished])];
  const stillOpen = (id: string | null) => id !== null && !completedLessonIds.includes(id);
  const next = lessons.find((l) => !completedLessonIds.includes(l.id) && l.levelId === progress.levelId)
    ?? lessons.find((l) => !completedLessonIds.includes(l.id));

  const earnedXp = finished.reduce((sum, id) => sum + (results[id]?.correct ?? 0) * XP_PER_CORRECT_ANSWER, 0);

  return {
    ...progress,
    completedLessonIds,
    currentLessonId: stillOpen(progress.currentLessonId) ? progress.currentLessonId : (next?.id ?? null),
    totalXp: progress.totalXp + earnedXp,
  };
}
