import { STORAGE_KEYS } from '@/constants/app';
import { languages } from '@/mocks/languages';
import { lessons } from '@/mocks/lessons';
import { levels } from '@/mocks/levels';
import { getMockPlan, getMockProgress, getMockStreak } from '@/mocks/progress';
import { vocabulary } from '@/mocks/vocabulary';
import type { LanguageCode, LearningPlan, LearningProfile } from '@/types';
import { buildExercises } from '@/utils/exercises';
import { addStudyMinutes, applyLessonCompletion } from '@/utils/progression';

import { createMemoryStorage, type KeyValueStorage } from '../storage';
import { isSavedProfile, parseSavedLearning, parseSavedProfiles, progressKey, type SavedLearning } from './savedData';
import type { Repositories } from './types';

const key = progressKey;
// The learner's calendar day (device time zone), so "today" ends at local midnight, not UTC midnight.
const pad = (n: number) => String(n).padStart(2, '0');
const dayOf = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** A corrupt or foreign blob must never block the app: it is treated as "nothing saved", and a single bad record is dropped on its own (see savedData.ts). */
async function readSaved(storage: KeyValueStorage): Promise<SavedLearning> {
  try {
    return parseSavedLearning(await storage.getItem(STORAGE_KEYS.learningProgress));
  } catch {
    return { progress: {}, plans: {} };
  }
}

async function readProfiles(storage: KeyValueStorage): Promise<Record<string, LearningProfile>> {
  try {
    return parseSavedProfiles(await storage.getItem(STORAGE_KEYS.learningProfile));
  } catch {
    return {};
  }
}

interface Options {
  /** Where progress survives restarts. Defaults to memory (isolated, used by tests). */
  storage?: KeyValueStorage;
  now?: () => Date;
}

// Async signatures match what a real backend will need. Seed data is the starting point; progress
// and study time then live in `storage`, so finished lessons survive closing the app.
export function createMockRepositories({ storage = createMemoryStorage(), now = () => new Date() }: Options = {}): Repositories {
  let loading: Promise<SavedLearning> | null = null;
  let queue: Promise<unknown> = Promise.resolve();

  const load = () => (loading ??= readSaved(storage));
  // Writes are chained so two quick completions cannot overwrite each other's save.
  const exclusive = <T,>(task: () => Promise<T>): Promise<T> => {
    const run = queue.then(task, task);
    queue = run.catch(() => undefined);
    return run;
  };

  const readProgress = async (userId: string, language: LanguageCode) =>
    (await load()).progress[key(userId, language)] ?? getMockProgress(userId, language);

  const readPlan = async (userId: string, language: LanguageCode): Promise<LearningPlan> => {
    const entry = (await load()).plans[key(userId, language)];
    if (!entry) return getMockPlan(userId, language);
    return entry.day === dayOf(now()) ? entry.plan : { ...entry.plan, minutesToday: 0 };
  };

  return {
    languages: {
      getAll: async () => languages,
      getTargets: async () => languages.filter((l) => l.roles.includes('target')),
      getSources: async () => languages.filter((l) => l.roles.includes('source')),
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
      get: readProgress,
      getStreak: async (userId) => getMockStreak(userId),
      completeLesson: (userId, lessonId, result) =>
        exclusive(async () => {
          const lesson = lessons.find((l) => l.id === lessonId);
          if (!lesson) throw new Error(`Unknown lesson "${lessonId}"`);
          const current = await readProgress(userId, lesson.targetLanguage);
          if (!current) throw new Error(`No progress for ${lesson.targetLanguage}`);

          const own = lessons.filter((l) => l.targetLanguage === lesson.targetLanguage);
          const wordCount = vocabulary.filter((w) => w.lessonId === lessonId).length;
          const updated = applyLessonCompletion(current, lesson, own, levels, result, wordCount);
          const plan = addStudyMinutes(await readPlan(userId, lesson.targetLanguage), lesson.estimatedMinutes);

          // Save first, then publish to memory: a failed write leaves state untouched, so the
          // lesson screen's retry sees the same starting point.
          const saved = await load();
          const next: SavedLearning = {
            progress: { ...saved.progress, [key(userId, lesson.targetLanguage)]: updated },
            plans: { ...saved.plans, [key(userId, lesson.targetLanguage)]: { plan, day: dayOf(now()) } },
          };
          await storage.setItem(STORAGE_KEYS.learningProgress, JSON.stringify(next));
          loading = Promise.resolve(next);
          return updated;
        }),
    },
    plans: {
      get: readPlan,
    },
    profiles: {
      get: async (userId) => (await readProfiles(storage))[userId] ?? null,
      set: (userId, profile) =>
        exclusive(async () => {
          if (!isSavedProfile(profile)) throw new Error('Invalid learning profile');
          const saved = await readProfiles(storage);
          await storage.setItem(STORAGE_KEYS.learningProfile, JSON.stringify({ ...saved, [userId]: profile }));
        }),
    },
  };
}
