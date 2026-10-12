import { exercises } from '@/mocks/exercises';
import { languages } from '@/mocks/languages';
import { lessons } from '@/mocks/lessons';
import { levels } from '@/mocks/levels';
import { getMockPlan, getMockProgress, getMockStreak } from '@/mocks/progress';

import type { Repositories } from './types';

// Async signatures match what a real backend will need; the data is static.
export function createMockRepositories(): Repositories {
  return {
    languages: {
      getAll: async () => languages,
      getTargets: async () => languages.filter((l) => l.roles.includes('target')),
      getByCode: async (code) => languages.find((l) => l.code === code) ?? null,
    },
    levels: {
      getAll: async () => levels,
      getById: async (id) => levels.find((l) => l.id === id) ?? null,
    },
    lessons: {
      getByLanguage: async (language) =>
        lessons.filter((l) => l.targetLanguage === language).sort((a, b) => a.order - b.order),
      getById: async (id) => lessons.find((l) => l.id === id) ?? null,
    },
    exercises: {
      getByLesson: async (lessonId) => exercises.filter((e) => e.lessonId === lessonId),
    },
    progress: {
      get: async (userId, language) => getMockProgress(userId, language),
    },
    streaks: {
      get: async (userId) => getMockStreak(userId),
    },
    plans: {
      get: async (userId, language) => getMockPlan(userId, language),
    },
  };
}
