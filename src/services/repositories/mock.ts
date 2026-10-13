import { STORAGE_KEYS } from '@/constants/app';
import { languages } from '@/mocks/languages';
import { lessons } from '@/mocks/lessons';
import { levels } from '@/mocks/levels';
import { getMockPlan, getMockProgress, getMockStreak } from '@/mocks/progress';
import { vocabulary } from '@/mocks/vocabulary';
import type { LanguageCode, LearningPlan, Progress } from '@/types';
import { buildExercises } from '@/utils/exercises';
import { addStudyMinutes, applyLessonCompletion } from '@/utils/progression';

import { createMemoryStorage, type KeyValueStorage } from '../storage';
import type { Repositories } from './types';

const key = (userId: string, language: LanguageCode) => `${userId}:${language}`;
// The learner's calendar day (device time zone), so "today" ends at local midnight, not UTC midnight.
const pad = (n: number) => String(n).padStart(2, '0');
const dayOf = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

interface Saved {
  progress: Record<string, Progress>;
  /** Study minutes belong to a calendar day; an older day counts as 0 today. */
  plans: Record<string, { plan: LearningPlan; day: string }>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const languageCodes = new Set<string>(languages.map((l) => l.code));
const levelIds = new Set<string>(levels.map((l) => l.id));

function isProgress(value: unknown): value is Progress {
  if (!isRecord(value)) return false;
  return (
    typeof value.userId === 'string' &&
    typeof value.targetLanguage === 'string' &&
    languageCodes.has(value.targetLanguage) &&
    typeof value.levelId === 'string' &&
    levelIds.has(value.levelId) &&
    Array.isArray(value.completedLessonIds) &&
    value.completedLessonIds.every((id) => typeof id === 'string') &&
    (value.currentLessonId === null || typeof value.currentLessonId === 'string') &&
    finite(value.levelProgress) &&
    finite(value.totalXp) &&
    finite(value.wordsLearned) &&
    finite(value.minutesLearned)
  );
}

function isPlanEntry(value: unknown): value is Saved['plans'][string] {
  if (!isRecord(value) || typeof value.day !== 'string' || !isRecord(value.plan)) return false;
  const { plan } = value;
  return typeof plan.userId === 'string' && typeof plan.targetLanguage === 'string' && finite(plan.dailyGoalMinutes) && finite(plan.minutesToday);
}

function pickValid<T>(source: Record<string, unknown>, isValid: (value: unknown) => value is T): Record<string, T> {
  const out: Record<string, T> = {};
  for (const [name, value] of Object.entries(source)) if (isValid(value)) out[name] = value;
  return out;
}

/** A corrupt or foreign blob must never block the app: it is treated as "nothing saved", and a single bad entry is dropped on its own. */
async function readSaved(storage: KeyValueStorage): Promise<Saved> {
  const empty: Saved = { progress: {}, plans: {} };
  try {
    const raw = await storage.getItem(STORAGE_KEYS.learningProgress);
    if (!raw) return empty;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || !isRecord(parsed.progress) || !isRecord(parsed.plans)) return empty;
    return { progress: pickValid(parsed.progress, isProgress), plans: pickValid(parsed.plans, isPlanEntry) };
  } catch {
    return empty;
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
  let loading: Promise<Saved> | null = null;
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
          const next: Saved = {
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
  };
}
