import type { LanguageCode, LearningPlan, Progress, Streak } from '@/types';

type ProgressSeed = Omit<Progress, 'userId'>;

// Only A1 lessons exist in the mock data, so a level above A1 means every A1 lesson is done and
// no lesson is current (`currentLessonId: null`). mocks/mocks.test.ts enforces these invariants.
const seeds: Record<Exclude<LanguageCode, 'ar'>, ProgressSeed> = {
  de: {
    targetLanguage: 'de',
    levelId: 'A1',
    completedLessonIds: ['de-a1-1', 'de-a1-2'],
    currentLessonId: 'de-a1-3',
    levelProgress: 0.67,
    totalXp: 1280,
    wordsLearned: 164,
    minutesLearned: 540,
  },
  en: {
    targetLanguage: 'en',
    levelId: 'A2',
    completedLessonIds: ['en-a1-1', 'en-a1-2', 'en-a1-3'],
    currentLessonId: null,
    levelProgress: 0,
    totalXp: 2210,
    wordsLearned: 420,
    minutesLearned: 960,
  },
  es: {
    targetLanguage: 'es',
    levelId: 'A1',
    completedLessonIds: [],
    currentLessonId: 'es-a1-1',
    levelProgress: 0,
    totalXp: 40,
    wordsLearned: 9,
    minutesLearned: 12,
  },
  fr: {
    targetLanguage: 'fr',
    levelId: 'A1',
    completedLessonIds: ['fr-a1-1'],
    currentLessonId: 'fr-a1-2',
    levelProgress: 0.33,
    totalXp: 310,
    wordsLearned: 48,
    minutesLearned: 95,
  },
  tr: {
    targetLanguage: 'tr',
    levelId: 'A1',
    completedLessonIds: [],
    currentLessonId: 'tr-a1-1',
    levelProgress: 0,
    totalXp: 0,
    wordsLearned: 0,
    minutesLearned: 0,
  },
};

export function getMockProgress(userId: string, language: LanguageCode): Progress | null {
  if (language === 'ar') return null; // Arabic is not a target language yet
  return { userId, ...seeds[language] };
}

export function getMockStreak(userId: string): Streak {
  return { userId, days: 7 };
}

export function getMockPlan(userId: string, language: LanguageCode): LearningPlan {
  return {
    userId,
    targetLanguage: language,
    dailyGoalMinutes: 15,
    minutesToday: language === 'de' ? 9 : 0,
  };
}
