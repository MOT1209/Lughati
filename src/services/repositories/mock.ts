import { languages } from '@/mocks/languages';
import { lessons } from '@/mocks/lessons';
import { levels } from '@/mocks/levels';
import { getMockPlan, getMockProgress, getMockStreak } from '@/mocks/progress';
import { vocabulary } from '@/mocks/vocabulary';
import type { LanguageCode, LearningPlan, Progress } from '@/types';
import { buildExercises } from '@/utils/exercises';
import { addStudyMinutes, applyLessonCompletion } from '@/utils/progression';

import type { Repositories } from './types';

const key = (userId: string, language: LanguageCode) => `${userId}:${language}`;

// Async signatures match what a real backend will need. Progress and plans start from the seed
// data and then live in memory, so finishing a lesson is visible until the app is closed.
export function createMockRepositories(): Repositories {
  const progressState = new Map<string, Progress>();
  const planState = new Map<string, LearningPlan>();

  const readProgress = (userId: string, language: LanguageCode) =>
    progressState.get(key(userId, language)) ?? getMockProgress(userId, language);
  const readPlan = (userId: string, language: LanguageCode) =>
    planState.get(key(userId, language)) ?? getMockPlan(userId, language);

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
      getVocabulary: async (lessonId) => vocabulary.filter((w) => w.lessonId === lessonId),
      getExercises: async (lessonId) =>
        buildExercises(lessonId, vocabulary.filter((w) => w.lessonId === lessonId)),
    },
    progress: {
      get: async (userId, language) => readProgress(userId, language),
      getStreak: async (userId) => getMockStreak(userId),
      completeLesson: async (userId, lessonId, result) => {
        const lesson = lessons.find((l) => l.id === lessonId);
        if (!lesson) throw new Error(`Unknown lesson "${lessonId}"`);
        const current = readProgress(userId, lesson.targetLanguage);
        if (!current) throw new Error(`No progress for ${lesson.targetLanguage}`);

        const own = lessons.filter((l) => l.targetLanguage === lesson.targetLanguage);
        const wordCount = vocabulary.filter((w) => w.lessonId === lessonId).length;
        const updated = applyLessonCompletion(current, lesson, own, levels, result, wordCount);

        progressState.set(key(userId, lesson.targetLanguage), updated);
        planState.set(
          key(userId, lesson.targetLanguage),
          addStudyMinutes(readPlan(userId, lesson.targetLanguage), lesson.estimatedMinutes),
        );
        return updated;
      },
    },
    plans: {
      get: async (userId, language) => readPlan(userId, language),
    },
  };
}
