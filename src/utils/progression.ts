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

/** Upper bound on the study time one run can credit, so a quiz left open does not inflate the total. */
export const MAX_RUN_MINUTES = 30;

/** Whole minutes actually spent on a run: at least 1, at most MAX_RUN_MINUTES. */
export function studyMinutesOf(elapsedMs: number): number {
  const minutes = Math.round(Math.max(0, elapsedMs) / 60_000);
  return Math.min(Math.max(minutes, 1), MAX_RUN_MINUTES);
}

/** Lessons of a language ordered the way they are taken: by level, then by order. */
function takeOrder(lessons: Lesson[], levels: Level[]): Lesson[] {
  const rank = (id: LevelId) => levels.findIndex((level) => level.id === id);
  return [...lessons].sort((a, b) => rank(a.levelId) - rank(b.levelId) || a.order - b.order);
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
  minutes: number,
): Progress {
  const isReplay = progress.completedLessonIds.includes(lesson.id);
  const studied = {
    totalXp: progress.totalXp + lessonXp(result),
    minutesLearned: progress.minutesLearned + minutes,
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

  const rankOfLevel = (id: LevelId) => levels.findIndex((level) => level.id === id);
  const next = ordered.find((l) => !completed.includes(l.id) && rankOfLevel(l.levelId) <= levelIndex);

  return {
    ...progress,
    levelId,
    completedLessonIds: completed,
    currentLessonId: next?.id ?? null,
    levelProgress: here.length === 0 ? 0 : Math.round((done / here.length) * 100) / 100,
    ...studied,
    wordsLearned: progress.wordsLearned + (isReplay ? 0 : wordCount),
  };
}

export function addStudyMinutes(plan: LearningPlan, minutes: number): LearningPlan {
  return { ...plan, minutesToday: plan.minutesToday + minutes };
}
