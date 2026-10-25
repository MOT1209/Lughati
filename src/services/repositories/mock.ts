import { STORAGE_KEYS } from '@/constants/app';
import { languages } from '@/mocks/languages';
import { lessons } from '@/mocks/lessons';
import { levels } from '@/mocks/levels';
import { getMockPlan, getMockProgress } from '@/mocks/progress';
import { vocabulary } from '@/mocks/vocabulary';
import type {
  ActivityDay,
  LanguageCode,
  LearningPlan,
  LearningProfile,
  LessonAttempt,
  LevelId,
  VocabularyReviewState,
} from '@/types';
import { buildExercises } from '@/utils/exercises';
import { addStudyMinutes, applyLessonCompletion, isPassed, lessonXp } from '@/utils/progression';
import { computeStreakStats } from '@/utils/streaks';
import { initialReviewState, scheduleReview } from '@/utils/srs';

import { createMemoryStorage, type KeyValueStorage } from '../storage';
import {
  activityKey,
  attemptListKey,
  dayOf,
  isSavedProfile,
  MAX_ATTEMPTS_PER_RECORD,
  MAX_DAILY_GOAL_MINUTES,
  parseSavedLearning,
  parseSavedProfiles,
  parseSavedReviews,
  progressKey,
  reviewStateKey,
  type SavedLearning,
} from './savedData';
import type { Repositories } from './types';

const key = progressKey;

const MIN_DAILY_GOAL_MINUTES = 5;

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

async function readReviews(storage: KeyValueStorage): Promise<Record<string, VocabularyReviewState>> {
  try {
    return parseSavedReviews(await storage.getItem(STORAGE_KEYS.vocabReviews));
  } catch {
    return {};
  }
}

const reviewKeyOf = (userId: string, wordId: string) => reviewStateKey({ userId, wordId } as VocabularyReviewState);

// Async signatures match what a real backend will need. Seed data is the starting point; progress,
// study time and activity then live in `storage`, so finished lessons survive closing the app.
export function createMockRepositories({ storage = createMemoryStorage(), now = () => new Date() }: Options = {}): Repositories {
  // The learner's calendar day (device time zone), so "today" ends at local midnight, not UTC
  // midnight. Derived from the injectable clock, so tests can freeze the day.
  const todayOf = () => dayOf(now());

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
    return entry.day === todayOf() ? entry.plan : { ...entry.plan, minutesToday: 0 };
  };

  const attemptsFor = async (userId: string, language: LanguageCode): Promise<LessonAttempt[]> =>
    (await load()).attempts?.[key(userId, language)] ?? [];

  /**
   * Adds observed study (a lesson run or a review) to today's ActivityDay, creating it on the
   * first event of the day. Any recorded day counts toward the streak.
   */
  const recordActivity = async (
    userId: string,
    delta: Partial<Pick<ActivityDay, 'minutes' | 'xp' | 'lessonsCompleted' | 'correctAnswers'>>,
    at: Date = now(),
  ): Promise<{ saved: SavedLearning; next: SavedLearning }> => {
    const saved = await load();
    const day = dayOf(at);
    const currentDay: ActivityDay = saved.activity?.[activityKey(userId, day)] ?? {
      userId,
      day,
      minutes: 0,
      xp: 0,
      lessonsCompleted: 0,
      correctAnswers: 0,
    };
    const nextDay: ActivityDay = {
      ...currentDay,
      minutes: currentDay.minutes + (delta.minutes ?? 0),
      xp: currentDay.xp + (delta.xp ?? 0),
      lessonsCompleted: currentDay.lessonsCompleted + (delta.lessonsCompleted ?? 0),
      correctAnswers: currentDay.correctAnswers + (delta.correctAnswers ?? 0),
    };
    return {
      saved,
      next: {
        ...saved,
        activity: { ...saved.activity, [activityKey(userId, day)]: nextDay },
      },
    };
  };

  const lessonOf = (lessonId: string) => lessons.find((l) => l.id === lessonId);
  const levelRank = (id: LevelId) => levels.findIndex((level) => level.id === id);

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
      // The order they are taken in: by level (A1 before A2), then by position in the level.
      getByLanguage: async (language) =>
        lessons
          .filter((l) => l.targetLanguage === language)
          .sort((a, b) => levelRank(a.levelId) - levelRank(b.levelId) || a.order - b.order),
      getById: async (id) => lessonOf(id) ?? null,
      getVocabulary: async (lessonId) => vocabulary.filter((w) => w.lessonId === lessonId),
      getExercises: async (lessonId) =>
        buildExercises(lessonId, vocabulary.filter((w) => w.lessonId === lessonId)),
    },
    progress: {
      get: readProgress,
      getStreak: async (userId) => {
        const saved = await load();
        const days = Object.entries(saved.activity ?? {})
          .filter(([name, record]) => name === activityKey(record.userId, record.day) && record.userId === userId)
          .map(([, record]) => record.day);
        const stats = computeStreakStats(days, todayOf());
        return { userId, days: stats.current, best: stats.best };
      },
      completeLesson: (userId, lessonId, result) =>
        exclusive(async () => {
          const lesson = lessonOf(lessonId);
          if (!lesson) throw new Error(`Unknown lesson "${lessonId}"`);
          const current = await readProgress(userId, lesson.targetLanguage);
          if (!current) throw new Error(`No progress for ${lesson.targetLanguage}`);

          const own = lessons.filter((l) => l.targetLanguage === lesson.targetLanguage);
          const wordCount = vocabulary.filter((w) => w.lessonId === lessonId).length;
          const updated = applyLessonCompletion(current, lesson, own, levels, result, wordCount);
          const passed = isPassed(result);
          const countedAsCompletion = passed && !current.completedLessonIds.includes(lessonId);
          const xpDelta = lessonXp(result);
          const plan = addStudyMinutes(await readPlan(userId, lesson.targetLanguage), lesson.estimatedMinutes);

          const attempt: LessonAttempt = {
            id: `${userId}:${lesson.targetLanguage}:${lessonId}:${now().toISOString()}`,
            userId,
            lessonId,
            targetLanguage: lesson.targetLanguage,
            attemptedAt: now().toISOString(),
            result: { correct: result.correct, total: result.total },
            completed: passed,
            kind: 'lesson',
          };
          const prior = await attemptsFor(userId, lesson.targetLanguage);
          const attempts = [...prior, attempt].slice(-MAX_ATTEMPTS_PER_RECORD);

          // A pass puts the lesson's words on the review schedule. Words that already have a state
          // keep it (a replay must not reset their progress). Written before the progress blob:
          // if that second write fails, the retry finds the words scheduled and adds nothing twice.
          if (passed) {
            const reviews = await readReviews(storage);
            const start = initialReviewState(now());
            const added: Record<string, VocabularyReviewState> = {};
            for (const word of vocabulary.filter((w) => w.lessonId === lessonId)) {
              const storageKey = reviewKeyOf(userId, word.id);
              if (reviews[storageKey]) continue;
              added[storageKey] = {
                userId,
                targetLanguage: lesson.targetLanguage,
                wordId: word.id,
                step: start.step,
                correctCount: 0,
                wrongCount: 0,
                lastReviewedAt: null,
                nextReviewAt: start.nextReviewAt,
              };
            }
            if (Object.keys(added).length > 0) {
              await storage.setItem(STORAGE_KEYS.vocabReviews, JSON.stringify({ reviews: { ...reviews, ...added } }));
            }
          }

          const { saved, next: withActivity } = await recordActivity(userId, {
            minutes: lesson.estimatedMinutes,
            xp: xpDelta,
            lessonsCompleted: countedAsCompletion ? 1 : 0,
            correctAnswers: result.correct,
          });
          const next: SavedLearning = {
            ...withActivity,
            progress: { ...(saved.progress ?? {}), [key(userId, lesson.targetLanguage)]: updated },
            plans: {
              ...(saved.plans ?? {}),
              [key(userId, lesson.targetLanguage)]: { plan, day: todayOf() },
            },
            attempts: { ...saved.attempts, [attemptListKey(attempts)]: attempts },
          };
          // Save first, then publish to memory: a failed write leaves state untouched, so the
          // lesson screen's retry sees the same starting point.
          await storage.setItem(STORAGE_KEYS.learningProgress, JSON.stringify(next));
          loading = Promise.resolve(next);
          return updated;
        }),
      getAttempts: attemptsFor,
      recordAttempt: (userId, lessonId, result, options) =>
        exclusive(async () => {
          const completed = options?.completed ?? false;
          const lesson = lessonOf(lessonId);
          if (!lesson) throw new Error(`Unknown lesson "${lessonId}"`);
          const attempt: LessonAttempt = {
            id: `${userId}:${lesson.targetLanguage}:${lessonId}:${now().toISOString()}`,
            userId,
            lessonId,
            targetLanguage: lesson.targetLanguage,
            attemptedAt: now().toISOString(),
            result: { correct: result.correct, total: result.total },
            completed,
            kind: options?.kind ?? 'lesson',
          };
          const prior = await attemptsFor(userId, lesson.targetLanguage);
          const attempts = [...prior, attempt].slice(-MAX_ATTEMPTS_PER_RECORD);
          const saved = await load();
          const next: SavedLearning = {
            ...saved,
            attempts: { ...saved.attempts, [attemptListKey(attempts)]: attempts },
          };
          await storage.setItem(STORAGE_KEYS.learningProgress, JSON.stringify(next));
          loading = Promise.resolve(next);
          return attempt;
        }),
    },
    plans: {
      get: readPlan,
      setDailyGoal: (userId, language, minutes) =>
        exclusive(async () => {
          // Clamp, don't reject: the goal system stays usable on odd inputs.
          const dailyGoalMinutes = Math.min(Math.max(Math.round(minutes), MIN_DAILY_GOAL_MINUTES), MAX_DAILY_GOAL_MINUTES);
          const base = await readPlan(userId, language);
          const updated: LearningPlan = { ...base, dailyGoalMinutes };
          const saved = await load();
          const next: SavedLearning = {
            ...saved,
            plans: { ...(saved.plans ?? {}), [key(userId, language)]: { plan: updated, day: todayOf() } },
          };
          await storage.setItem(STORAGE_KEYS.learningProgress, JSON.stringify(next));
          loading = Promise.resolve(next);
          return updated;
        }),
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
    activity: {
      getDay: async (userId, day) => (await load()).activity?.[activityKey(userId, day)] ?? null,
      getRecent: async (userId, days) => {
        const saved = await load();
        const prefix = `${userId}:`;
        const entries = Object.entries(saved.activity ?? {})
          .map(([name, record]) => ({ name, record }))
          .filter(({ name }) => name.startsWith(prefix))
          .sort((a, b) => a.record.day.localeCompare(b.record.day));
        return entries.slice(-Math.max(days, 0)).map((e) => e.record);
      },
    },
    reviews: {
      get: async (userId, wordId) => {
        const reviews = await readReviews(storage);
        return reviews[reviewKeyOf(userId, wordId)] ?? null;
      },
      getDue: async (userId, language, dueUpTo = now()) => {
        const reviews = await readReviews(storage);
        // Due from the start of its local calendar day, not the exact hour: a word scheduled for
        // "tomorrow" by a lesson at 22:00 is offered tomorrow morning, matching the day shown.
        const today = dayOf(dueUpTo);
        return Object.entries(reviews)
          .filter(([name, state]) => name === reviewStateKey(state) && state.userId === userId && state.targetLanguage === language)
          .filter(([, state]) => dayOf(new Date(state.nextReviewAt)) <= today)
          .map(([, state]) => state)
          .sort((a, b) => a.nextReviewAt.localeCompare(b.nextReviewAt));
      },
      recordReview: (userId, language, wordId, outcome) =>
        exclusive(async () => {
          const word = vocabulary.find((w) => w.id === wordId);
          if (!word || word.targetLanguage !== language) {
            throw new Error(`Unknown "${language}" vocabulary entry "${wordId}"`);
          }
          const reviews = await readReviews(storage);
          const storageKey = reviewKeyOf(userId, wordId);
          const before = reviews[storageKey] ?? null;
          const time = now();
          const scheduled = scheduleReview(before ? { step: before.step } : null, outcome, time);
          const state: VocabularyReviewState = {
            userId,
            targetLanguage: language,
            wordId,
            step: scheduled.step,
            correctCount: (before?.correctCount ?? 0) + (outcome === 'good' || outcome === 'easy' ? 1 : 0),
            wrongCount: (before?.wrongCount ?? 0) + (outcome === 'again' || outcome === 'difficult' ? 1 : 0),
            lastReviewedAt: time.toISOString(),
            nextReviewAt: scheduled.nextReviewAt,
          };
          await storage.setItem(STORAGE_KEYS.vocabReviews, JSON.stringify({ reviews: { ...reviews, [storageKey]: state } }));
          // A review is study too: it keeps the streak (no minutes, XP or completion are invented).
          // Saved after the review state, so a failed write here only loses the day, not the review.
          const { next } = await recordActivity(userId, { correctAnswers: outcome === 'good' || outcome === 'easy' ? 1 : 0 }, time);
          await storage.setItem(STORAGE_KEYS.learningProgress, JSON.stringify(next));
          loading = Promise.resolve(next);
          return state;
        }),
    },
  };
}
