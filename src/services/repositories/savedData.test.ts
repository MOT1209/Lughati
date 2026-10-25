import { STORAGE_KEYS } from '@/constants/app';
import { lessons } from '@/mocks/lessons';
import { getMockPlan, getMockProgress } from '@/mocks/progress';

import { createMemoryStorage } from '../storage';
import { createMockRepositories } from './mock';
import type { ActivityDay, LanguageCode, LessonAttempt, VocabularyReviewState } from '@/types';
import {
  activityKey,
  attemptListKey,
  isSavedActivity,
  isSavedAttemptList,
  isSavedReviewState,
  parseSavedLearning,
  parseSavedReviews,
  isSavedPlan,
  isSavedProgress,
  progressKey,
  reviewStateKey,
} from './savedData';

const validAttempt = (overrides: Partial<LessonAttempt> = {}): LessonAttempt => ({
  id: `a1`,
  userId: 'u1',
  lessonId: 'de-a1-1',
  targetLanguage: 'de',
  attemptedAt: '2026-10-12T10:00:00.000Z',
  result: { correct: 10, total: 12 },
  completed: true,
  ...overrides,
});
const validActivity = (overrides: Partial<ActivityDay> = {}): ActivityDay => ({
  userId: 'u1',
  day: '2026-10-12',
  minutes: 18,
  xp: 140,
  lessonsCompleted: 2,
  correctAnswers: 20,
  ...overrides,
});
const validReview = (overrides: Partial<VocabularyReviewState> = {}): VocabularyReviewState => ({
  userId: 'u1',
  targetLanguage: 'de',
  wordId: 'de-a1-1-w1',
  step: 2,
  correctCount: 3,
  wrongCount: 1,
  lastReviewedAt: '2026-10-12T10:00:00.000Z',
  nextReviewAt: '2026-10-19T10:00:00.000Z',
  ...overrides,
});

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

describe('new records: attempts, activity and review states', () => {
  it('isSavedAttemptList accepts a valid list and rejects broken ones', () => {
    expect(isSavedAttemptList([validAttempt()])).toBe(true);
    expect(isSavedAttemptList([validAttempt(), validAttempt({ id: 'a2', lessonId: 'de-a1-2', completed: false, result: { correct: 4, total: 12 } })])).toBe(true);

    expect(isSavedAttemptList([])).toBe(false);
    // The run kind is optional (older saves have none) but must be a known one.
    expect(isSavedAttemptList([validAttempt({ kind: 'practice' })])).toBe(true);
    expect(isSavedAttemptList([validAttempt({ kind: 'lesson' })])).toBe(true);
    expect(isSavedAttemptList([validAttempt({ kind: 'quiz' as never })])).toBe(false);
    expect(isSavedAttemptList('array-not')).toBe(false);
    expect(isSavedAttemptList([validAttempt({ lessonId: 'fr-a1-1' })])).toBe(false); // lesson of another language
    expect(isSavedAttemptList([validAttempt({ targetLanguage: 'xx' as unknown as LanguageCode })])).toBe(false);
    expect(isSavedAttemptList([validAttempt({ result: { correct: 13, total: 12 } })])).toBe(false);
    expect(isSavedAttemptList([validAttempt({ attemptedAt: 'not-a-date' })])).toBe(false);
    expect(isSavedAttemptList([validAttempt({ id: '' })])).toBe(false);
    expect(isSavedAttemptList([validAttempt(), validAttempt()])).toBe(false); // duplicate ids
    expect(isSavedAttemptList([validAttempt(), validAttempt({ id: 'a2', userId: 'u2' })])).toBe(false); // mixed users
  });

  it('isSavedActivity accepts a valid day and rejects broken ones', () => {
    expect(isSavedActivity(validActivity())).toBe(true);
    expect(isSavedActivity(validActivity({ day: '2026-02-31' }))).toBe(false);
    expect(isSavedActivity(validActivity({ day: 'montag' }))).toBe(false);
    expect(isSavedActivity(validActivity({ minutes: -1 }))).toBe(false);
    expect(isSavedActivity(validActivity({ xp: 1.5 }))).toBe(false);
    expect(isSavedActivity(validActivity({ userId: '' }))).toBe(false);
  });

  it('isSavedReviewState accepts a known word and rejects unknown or foreign ones', () => {
    expect(isSavedReviewState(validReview())).toBe(true);
    expect(isSavedReviewState(validReview({ wordId: 'ghost' }))).toBe(false);
    expect(isSavedReviewState(validReview({ targetLanguage: 'fr' }))).toBe(false); // word is not French
    expect(isSavedReviewState(validReview({ step: -1 }))).toBe(false);
    expect(isSavedReviewState(validReview({ nextReviewAt: 'yesterday' }))).toBe(false);
    expect(isSavedReviewState(validReview({ lastReviewedAt: null }))).toBe(true);
  });

  it('a blob written by an older build (no attempts/activity) still parses', () => {
    const parsed = parseSavedLearning(blob({ 'u1:de': validProgress() }, { 'u1:de': validPlan() }));
    expect(parsed.attempts).toBeUndefined();
    expect(parsed.activity).toBeUndefined();
    expect(Object.keys(parsed.progress)).toEqual(['u1:de']);
  });

  it('new parsing keeps valid attempts/activity and drops records under foreign keys', () => {
    const attempts = [validAttempt(), validAttempt({ id: 'a2', lessonId: 'de-a1-2' })];
    const wrongSpot = [validAttempt({ userId: 'u2' })]; // consistent on its own, but stored in the wrong slot
    const parsed = parseSavedLearning(
      JSON.stringify({
        progress: { 'u1:de': validProgress() },
        plans: {},
        attempts: { [attemptListKey(attempts)]: attempts, 'someone-else:de': wrongSpot },
        activity: { [activityKey('u1', '2026-10-12')]: validActivity(), other: validActivity() },
      }),
    );
    expect(Object.keys(parsed.attempts!)).toEqual([attemptListKey(attempts)]);
    expect(Object.keys(parsed.activity!)).toEqual([activityKey('u1', '2026-10-12')]);
  });

  it('attempts stored under a key that does not match their first record are dropped', () => {
    const attempts = [validAttempt()];
    const parsed = parseSavedLearning(
      JSON.stringify({ progress: {}, plans: {}, attempts: { 'someone-else:de': attempts } }),
    );
    expect(parsed.attempts).toEqual({}); // the outer field exists, its only record was dropped
  });

  it('repositories persist attempts and activity from completeLesson and survive a restart', async () => {
    const storage = createMemoryStorage();
    let seq = 0;
    const repos = createMockRepositories({ storage, now: () => new Date(2026, 9, 12, 12, 0, ++seq) });

    await repos.progress.completeLesson('u1', 'de-a1-1', { correct: 11, total: 12 });
    const attempts = await repos.progress.getAttempts('u1', 'de');
    expect(attempts).toHaveLength(1);
    expect(attempts[0]).toMatchObject({ lessonId: 'de-a1-1', completed: true, result: { correct: 11, total: 12 } });

    const day = await repos.activity.getDay('u1', '2026-10-12');
    expect(day).toMatchObject({ minutes: 8, xp: 130, lessonsCompleted: 1, correctAnswers: 11 });

    const restarted = createMockRepositories({ storage, now: () => new Date(2026, 9, 12, 15) });
    expect(await restarted.progress.getAttempts('u1', 'de')).toHaveLength(1);
    expect((await restarted.activity.getDay('u1', '2026-10-12'))?.correctAnswers).toBe(11);
  });

  it('streaks come only from recorded activity, never from anything invented', async () => {
    const storage = createMemoryStorage();
    const repos = createMockRepositories({ storage, now: () => new Date(2026, 9, 12, 12) });
    expect(await repos.progress.getStreak('u1')).toEqual({ userId: 'u1', days: 0, best: 0 });

    await repos.progress.completeLesson('u1', 'de-a1-1', { correct: 12, total: 12 });
    expect(await repos.progress.getStreak('u1')).toEqual({ userId: 'u1', days: 1, best: 1 });
  });

  it('the daily goal is configurable and clamped, and survives a restart', async () => {    const storage = createMemoryStorage();
    const repos = createMockRepositories({ storage, now: () => new Date(2026, 9, 12, 12) });

    expect((await repos.plans.setDailyGoal('u1', 'de', 25)).dailyGoalMinutes).toBe(25);
    expect((await repos.plans.setDailyGoal('u1', 'de', 1)).dailyGoalMinutes).toBe(5); // clamped low
    expect((await repos.plans.setDailyGoal('u1', 'de', 99_999)).dailyGoalMinutes).toBe(24 * 60); // clamped high

    // The last written goal (24*60) survives a restart with the same day
    const restarted = createMockRepositories({ storage, now: () => new Date(2026, 9, 12, 18) });
    expect((await restarted.plans.get('u1', 'de')).dailyGoalMinutes).toBe(24 * 60);
  });

  it('vocabulary reviews are scheduled by the one scheduler, persisted and readable on restart', async () => {
    const storage = createMemoryStorage();
    let t = 0;
    const repos = createMockRepositories({ storage, now: () => new Date(2026, 9, 12, 9, 0, t++) });

    const state = await repos.reviews.recordReview('u1', 'de', 'de-a1-1-w1', 'good');
    expect(state.step).toBe(1);
    expect(state.lastReviewedAt).toBe(new Date(2026, 9, 12, 9, 0, t - 1).toISOString());
    expect(state.correctCount).toBe(1);

    expect(await repos.reviews.get('u1', 'de-a1-1-w1')).toMatchObject({ step: 1 });
    expect(await repos.reviews.get('u1', 'ghost')).toBeNull();

    // not due before the interval passes
    expect(await repos.reviews.getDue('u1', 'de', new Date(2026, 9, 12, 9))).toEqual([]);
    expect(await repos.reviews.getDue('u1', 'de', new Date(2026, 9, 13, 9))).toHaveLength(1);

    // due tomorrow only for the word's language
    expect(await repos.reviews.getDue('u1', 'fr', new Date(2026, 9, 13, 13))).toEqual([]);

    await expect(repos.reviews.recordReview('u1', 'fr', 'de-a1-1-w1', 'good')).rejects.toThrow();

    const restarted = createMockRepositories({ storage, now: () => new Date(2026, 9, 13, 13) });
    expect(await restarted.reviews.get('u1', 'de-a1-1-w1')).toMatchObject({ correctCount: 1 });
    expect(await restarted.reviews.getDue('u1', 'de')).toHaveLength(1);
  });

  it('reviews survive partial corruption: a bad record is dropped, valid ones remain', async () => {
    const storage = createMemoryStorage();
    const good = validReview();
    const bad = validReview({ wordId: 'ghost' });
    await storage.setItem(STORAGE_KEYS.vocabReviews, JSON.stringify({ reviews: { [reviewStateKey(good)]: good, [reviewStateKey(bad)]: bad } }));

    const repos = createMockRepositories({ storage });
    expect(await repos.reviews.get('u1', 'de-a1-1-w1')).toMatchObject({ step: 2 });
    expect(await repos.reviews.get('u1', 'ghost')).toBeNull();
    expect(parseSavedReviews(await storage.getItem(STORAGE_KEYS.vocabReviews))).toEqual({ [reviewStateKey(good)]: good });
  });
});
