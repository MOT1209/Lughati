import type { Level, LevelId, LearningPlan, Lesson, LessonResult, Progress } from '@/types';

export const XP_PER_CORRECT_ANSWER = 10;
export const XP_LESSON_BONUS = 20;

/** Lessons of a language ordered the way they are taken: by level, then by order. */
function takeOrder(lessons: Lesson[], levels: Level[]): Lesson[] {
  const rank = (id: LevelId) => levels.findIndex((level) => level.id === id);
  return [...lessons].sort((a, b) => rank(a.levelId) - rank(b.levelId) || a.order - b.order);
}

/**
 * Pure progression rules. Replaying a lesson changes nothing structural and adds no new words;
 * its XP and study time still count (the learner did the work).
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
  const completed = progress.completedLessonIds.includes(lesson.id)
    ? progress.completedLessonIds
    : [...progress.completedLessonIds, lesson.id];
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
    totalXp: progress.totalXp + result.correct * XP_PER_CORRECT_ANSWER + XP_LESSON_BONUS,
    wordsLearned: progress.wordsLearned + (isReplay ? 0 : wordCount),
    minutesLearned: progress.minutesLearned + lesson.estimatedMinutes,
  };
}

export function addStudyMinutes(plan: LearningPlan, minutes: number): LearningPlan {
  return { ...plan, minutesToday: plan.minutesToday + minutes };
}
