import { STORAGE_KEYS } from '@/constants/app';
import { lessons } from '@/mocks/lessons';
import { getMockPlan, getMockProgress } from '@/mocks/progress';

import { createMemoryStorage } from '../storage';
import { createMockRepositories } from './mock';
import { isSavedPlan, isSavedProgress, parseSavedLearning, progressKey } from './savedData';

// A learner part-way through German: two lessons done, the third current.
const validProgress = () => ({
  ...getMockProgress('u1', 'de')!,
  completedLessonIds: ['de-a1-1', 'de-a1-2'],
  currentLessonId: 'de-a1-3',
  levelProgress: 0.2,
  totalXp: 300,
  wordsLearned: 12,
  minutesLearned: 18,
});
const validPlan = () => ({ plan: { ...getMockPlan('u1', 'de') }, day: '2026-10-12' });
const blob = (progress: Record<string, unknown>, plans: Record<string, unknown> = {}) => JSON.stringify({ progress, plans });

describe('isSavedProgress', () => {
  it('accepts the seed data of every language and a fully finished course', () => {
    for (const code of ['ar', 'de', 'en', 'es', 'fr', 'tr'] as const) {
      expect(isSavedProgress(getMockProgress('u1', code))).toBe(true);
    }
    const finished = { ...validProgress(), completedLessonIds: lessons.filter((l) => l.targetLanguage === 'de').map((l) => l.id), currentLessonId: null, levelProgress: 1, wordsLearned: 60 };
    expect(isSavedProgress(finished)).toBe(true);
  });

  const cases: [string, (p: Record<string, unknown>) => void][] = [
    ['negative XP', (p) => (p.totalXp = -10)],
    ['fractional XP', (p) => (p.totalXp = 10.5)],
    ['XP above the sanity ceiling', (p) => (p.totalXp = 1e12)],
    ['negative minutes learned', (p) => (p.minutesLearned = -1)],
    ['negative word count', (p) => (p.wordsLearned = -3)],
    ['more words than the course has', (p) => (p.wordsLearned = 61)],
    ['non-numeric counter', (p) => (p.totalXp = '300')],
    ['null counter (what JSON makes of NaN/Infinity)', (p) => (p.minutesLearned = null)],
    ['levelProgress below 0', (p) => (p.levelProgress = -0.1)],
    ['levelProgress above 1', (p) => (p.levelProgress = 1.5)],
    ['unknown level', (p) => (p.levelId = 'Z9')],
    ['unknown language', (p) => (p.targetLanguage = 'xx')],
    ['missing user id', (p) => (p.userId = '')],
    ['non-array completed lessons', (p) => (p.completedLessonIds = 'de-a1-1')],
    ['unknown completed lesson id', (p) => (p.completedLessonIds = ['de-a1-1', 'nope'])],
    ['completed lesson of another language', (p) => (p.completedLessonIds = ['fr-a1-1'])],
    ['duplicate completed lessons', (p) => (p.completedLessonIds = ['de-a1-1', 'de-a1-1'])],
    ['unknown current lesson', (p) => (p.currentLessonId = 'ghost')],
    ['current lesson of another language', (p) => (p.currentLessonId = 'fr-a1-2')],
    ['current lesson that is already completed', (p) => (p.currentLessonId = 'de-a1-1')],
    ['level above A1 without the lower level finished', (p) => (p.levelId = 'A2')],
    ['missing fields', (p) => delete p.totalXp],
  ];
  it.each(cases)('rejects %s', (_name, mutate) => {
    const record = validProgress() as Record<string, unknown>;
    mutate(record);
    expect(isSavedProgress(record)).toBe(false);
  });

  it.each([null, 5, 'text', [], undefined])('rejects a non-object (%p)', (value) => {
    expect(isSavedProgress(value)).toBe(false);
  });
});

describe('isSavedPlan', () => {
  it('accepts a normal plan', () => expect(isSavedPlan(validPlan())).toBe(true));

  const cases: [string, (p: Record<string, any>) => void][] = [
    ['negative minutes today', (p) => (p.plan.minutesToday = -5)],
    ['fractional minutes today', (p) => (p.plan.minutesToday = 2.5)],
    ['zero daily goal', (p) => (p.plan.dailyGoalMinutes = 0)],
    ['daily goal above 24 hours', (p) => (p.plan.dailyGoalMinutes = 1441)],
    ['unknown language', (p) => (p.plan.targetLanguage = 'xx')],
    ['missing user id', (p) => (p.plan.userId = '')],
    ['malformed day', (p) => (p.day = 'yesterday')],
    ['impossible calendar day', (p) => (p.day = '2026-02-31')],
    ['missing plan', (p) => delete p.plan],
  ];
  it.each(cases)('rejects %s', (_name, mutate) => {
    const entry = validPlan() as Record<string, any>;
    mutate(entry);
    expect(isSavedPlan(entry)).toBe(false);
  });
});

describe('parseSavedLearning', () => {
  it('keeps valid records and drops only the invalid ones', () => {
    const good = validProgress();
    const bad = { ...validProgress(), userId: 'u2', totalXp: -1 };
    const parsed = parseSavedLearning(blob({ 'u1:de': good, 'u2:de': bad }, { 'u1:de': validPlan(), 'u2:de': { ...validPlan(), day: 'x' } }));
    expect(Object.keys(parsed.progress)).toEqual(['u1:de']);
    expect(Object.keys(parsed.plans)).toEqual(['u1:de']);
  });

  it('drops a record stored under a key that does not match its own user and language', () => {
    const parsed = parseSavedLearning(blob({ 'someone-else:de': validProgress(), 'u1:fr': validProgress() }, { 'u1:fr': validPlan() }));
    expect(parsed).toEqual({ progress: {}, plans: {} });
  });

  it('cannot be used to pollute prototypes through the key', () => {
    const parsed = parseSavedLearning('{"progress":{"__proto__":{"userId":"x"}},"plans":{}}');
    expect(Object.keys(parsed.progress)).toEqual([]);
    expect(({} as Record<string, unknown>).userId).toBeUndefined();
  });

  it.each([null, '', '{not json', '[]', '"text"', '{"progress":1,"plans":{}}', '{"progress":{}}'])('treats %p as nothing saved', (raw) => {
    expect(parseSavedLearning(raw)).toEqual({ progress: {}, plans: {} });
  });
});

describe('repositories with a partly corrupt store', () => {
  it('starts, serves valid records, falls back to seeds for invalid ones, and still saves lessons', async () => {
    const storage = createMemoryStorage();
    const good = { ...validProgress(), completedLessonIds: ['de-a1-1', 'de-a1-2', 'de-a1-3'], currentLessonId: 'de-a1-4', totalXp: 500 };
    const negativeXp = { ...getMockProgress('u1', 'fr')!, totalXp: -999 };
    const foreignLesson = { ...getMockProgress('u1', 'es')!, completedLessonIds: ['de-a1-1'] };
    await storage.setItem(
      STORAGE_KEYS.learningProgress,
      blob({ [progressKey('u1', 'de')]: good, [progressKey('u1', 'fr')]: negativeXp, [progressKey('u1', 'es')]: foreignLesson }, { 'u1:de': { plan: { ...getMockPlan('u1', 'de'), minutesToday: -4 }, day: '2026-10-12' } }),
    );

    const repos = createMockRepositories({ storage, now: () => new Date(2026, 9, 12, 12) });
    expect((await repos.progress.get('u1', 'de'))?.totalXp).toBe(500);
    expect((await repos.progress.get('u1', 'fr'))?.totalXp).toBe(0); // invalid record -> fresh start
    expect((await repos.progress.get('u1', 'es'))?.completedLessonIds).toEqual([]);
    expect((await repos.plans.get('u1', 'de')).minutesToday).toBe(0); // invalid plan -> fresh start

    await expect(repos.progress.completeLesson('u1', 'de-a1-4', { correct: 12, total: 12 })).resolves.toBeDefined();
    const restarted = createMockRepositories({ storage, now: () => new Date(2026, 9, 12, 12) });
    expect((await restarted.progress.get('u1', 'de'))?.completedLessonIds).toContain('de-a1-4');
  });

  it('everything the app itself saves passes validation: a whole course can be completed and reloaded', async () => {
    const storage = createMemoryStorage();
    const repos = createMockRepositories({ storage });
    const ids = lessons.filter((l) => l.targetLanguage === 'de').map((l) => l.id);
    for (const id of ids) await repos.progress.completeLesson('u1', id, { correct: 12, total: 12 });
    await repos.progress.completeLesson('u1', ids[0]!, { correct: 3, total: 12 }); // replay

    const reloaded = createMockRepositories({ storage });
    const progress = await reloaded.progress.get('u1', 'de');
    expect(progress?.completedLessonIds).toEqual(ids);
    expect(progress?.currentLessonId).toBeNull();
    expect(progress?.wordsLearned).toBe(60);
  });
});
