import type { LanguageCode, LearningPlan, Progress } from '@/types';

type ProgressSeed = Omit<Progress, 'userId'>;

// Realistic spread: German is the learner's main language, the rest are barely started.
const seeds: Record<LanguageCode, ProgressSeed> = {
  ar: {
    targetLanguage: 'ar',
    levelId: 'A1',
    completedLessonIds: [],
    currentLessonId: 'ar-a1-1',
    levelProgress: 0.1,
    streakDays: 0,
    totalXp: 60,
    wordsLearned: 14,
    minutesLearned: 20,
  },
  de: {
    targetLanguage: 'de',
    levelId: 'A2',
    completedLessonIds: ['de-a1-1', 'de-a1-2'],
    currentLessonId: 'de-a1-3',
    levelProgress: 0.42,
    streakDays: 7,
    totalXp: 1280,
    wordsLearned: 164,
    minutesLearned: 540,
  },
  en: {
    targetLanguage: 'en',
    levelId: 'B1',
    completedLessonIds: ['en-a1-1', 'en-a1-2', 'en-a1-3'],
    currentLessonId: null,
    levelProgress: 0.15,
    streakDays: 7,
    totalXp: 2210,
    wordsLearned: 420,
    minutesLearned: 960,
  },
  es: {
    targetLanguage: 'es',
    levelId: 'A1',
    completedLessonIds: [],
    currentLessonId: 'es-a1-1',
    levelProgress: 0.05,
    streakDays: 0,
    totalXp: 40,
    wordsLearned: 9,
    minutesLearned: 12,
  },
  fr: {
    targetLanguage: 'fr',
    levelId: 'A1',
    completedLessonIds: ['fr-a1-1'],
    currentLessonId: 'fr-a1-2',
    levelProgress: 0.3,
    streakDays: 2,
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
    streakDays: 0,
    totalXp: 0,
    wordsLearned: 0,
    minutesLearned: 0,
  },
};

export function getMockProgress(userId: string, language: LanguageCode): Progress | null {
  return { userId, ...seeds[language] };
}

export function getMockPlan(userId: string, language: LanguageCode): LearningPlan {
  return {
    userId,
    targetLanguage: language,
    dailyGoalMinutes: 15,
    minutesToday: language === 'de' ? 9 : 0,
  };
}
