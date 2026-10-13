import type { LanguageCode, LearningPlan, Progress, Streak } from '@/types';

// A new learner starts every language at A1, lesson 1, with nothing done yet: no invented XP,
// minutes or streak is shown as the learner's own. Only A1 lessons exist (mocks.test.ts checks
// that the first lesson of each language exists).
const firstLesson = (language: LanguageCode) => `${language}-a1-1`;

export function getMockProgress(userId: string, language: LanguageCode): Progress | null {
  return {
    userId,
    targetLanguage: language,
    levelId: 'A1',
    completedLessonIds: [],
    currentLessonId: firstLesson(language),
    levelProgress: 0,
    totalXp: 0,
    wordsLearned: 0,
    minutesLearned: 0,
  };
}

export function getMockStreak(userId: string): Streak {
  return { userId, days: 0 }; // streak tracking does not exist yet
}

export function getMockPlan(userId: string, language: LanguageCode): LearningPlan {
  return {
    userId,
    targetLanguage: language,
    dailyGoalMinutes: 15,
    minutesToday: 0,
  };
}
