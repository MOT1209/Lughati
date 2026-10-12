import type { LanguageCode, LearningPlan, Progress, Streak } from '@/types';

type ProgressSeed = Omit<Progress, 'userId'>;

// Every learner starts at A1 and only A1 lessons exist, so a level above A1 would mean every
// lesson is done and no lesson is current (`currentLessonId: null`). mocks.test.ts enforces this.
const seeds: Record<Exclude<LanguageCode, 'ar'>, ProgressSeed> = {
  de: {
    targetLanguage: 'de',
    levelId: 'A1',
    completedLessonIds: ['de-a1-1', 'de-a1-2'],
    currentLessonId: 'de-a1-3',
    levelProgress: 0.2,
    totalXp: 300,
    wordsLearned: 12,
    minutesLearned: 18,
  },
  en: {
    targetLanguage: 'en',
    levelId: 'A1',
    completedLessonIds: [],
    currentLessonId: 'en-a1-1',
    levelProgress: 0,
    totalXp: 0,
    wordsLearned: 0,
    minutesLearned: 0,
  },
  es: {
    targetLanguage: 'es',
    levelId: 'A1',
    completedLessonIds: [],
    currentLessonId: 'es-a1-1',
    levelProgress: 0,
    totalXp: 0,
    wordsLearned: 0,
    minutesLearned: 0,
  },
  fr: {
    targetLanguage: 'fr',
    levelId: 'A1',
    completedLessonIds: ['fr-a1-1'],
    currentLessonId: 'fr-a1-2',
    levelProgress: 0.1,
    totalXp: 140,
    wordsLearned: 6,
    minutesLearned: 8,
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
