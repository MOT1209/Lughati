import type { Level, LevelId, LearningPlan, Lesson, LessonResult, Progress } from '@/types';

import { scoreRatio } from './exercises';

export const XP_PER_CORRECT_ANSWER = 10;
export const XP_LESSON_BONUS = 20;
/** Share of correct answers a run needs to complete its lesson. */
export const PASS_RATIO = 0.7;

export function isPassed(result: LessonResult): boolean {
  return scoreRatio(result) >= PASS_RATIO;
}

/** XP for one run: every correct answer counts; the lesson bonus only comes with a pass. */
export function lessonXp(result: LessonResult): number {
  return result.correct * XP_PER_CORRECT_ANSWER + (isPassed(result) ? XP_LESSON_BONUS : 0);
}

/** Lessons of a language ordered the way they are taken: by level, then by order. */
function takeOrder(lessons: Lesson[], levels: Level[]): Lesson[] {
  const rank = (id: LevelId) => levels.findIndex((level) => level.id === id);
  return [...lessons].sort((a, b) => rank(a.levelId) - rank(b.levelId) || a.order - b.order);
}

/**
 * The first lesson, in take order, that is not completed and sits at or below `levelId`; null when
 * there is none. Also used on read: a learner who finished everything before new lessons shipped
 * resumes at the first new one instead of having no current lesson.
 */
export function nextLessonId(completedIds: string[], levelId: LevelId, lessons: Lesson[], levels: Level[]): string | null {
  const rank = (id: LevelId) => levels.findIndex((level) => level.id === id);
  const ceiling = rank(levelId);
  return takeOrder(lessons, levels).find((l) => !completedIds.includes(l.id) && rank(l.levelId) <= ceiling)?.id ?? null;
}

/**
 * Pure progression rules. A run below PASS_RATIO changes nothing structural: the lesson stays
 * current and its words are not counted; its XP and study time still count. Replaying a lesson
 * also changes nothing structural and adds no new words; its XP and study time still count.
 *  - the level rises once every lesson of the current level is done;
 *  - the current lesson is the first unfinished one at or below the learner's level, or null;
 *  - level progress is done / total lessons at the level (0 when that level has no lessons yet).
 */
export function applyLessonCompletion(
  progress: Progress,
  lesson: Lesson,
  languageLessons: Lesson[],
  levels: Level[],
  result: LessonResult,
  wordCount: number,
): Progress {
  const isReplay = progress.completedLessonIds.includes(lesson.id);
  const studied = {
    totalXp: progress.totalXp + lessonXp(result),
    minutesLearned: progress.minutesLearned + lesson.estimatedMinutes,
  };
  if (!isPassed(result)) return { ...progress, ...studied };

  const completed = isReplay ? progress.completedLessonIds : [...progress.completedLessonIds, lesson.id];
  const ordered = takeOrder(languageLessons, levels);

  let levelIndex = levels.findIndex((level) => level.id === progress.levelId);
  const atLevel = (index: number) => ordered.filter((l) => l.levelId === levels[index]?.id);
  while (levelIndex < levels.length - 1) {
    const lessonsHere = atLevel(levelIndex);
    if (lessonsHere.length === 0 || !lessonsHere.every((l) => completed.includes(l.id))) break;
    levelIndex += 1;
  }
  const levelId = levels[levelIndex]!.id;
  const here = atLevel(levelIndex);
  const done = here.filter((l) => completed.includes(l.id)).length;

  return {
    ...progress,
    levelId,
    completedLessonIds: completed,
    currentLessonId: nextLessonId(completed, levelId, languageLessons, levels),
    levelProgress: here.length === 0 ? 0 : Math.round((done / here.length) * 100) / 100,
    ...studied,
    wordsLearned: progress.wordsLearned + (isReplay ? 0 : wordCount),
  };
}

export function addStudyMinutes(plan: LearningPlan, minutes: number): LearningPlan {
  return { ...plan, minutesToday: plan.minutesToday + minutes };
}
