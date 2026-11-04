import { lessons } from '@/mocks/lessons';
import { getMockPlan, getMockProgress } from '@/mocks/progress';
import type { LessonAttempt, Progress } from '@/types';

import { PASS_RATIO } from './progression';
import { getRecommendations, hasUnits, RETRY_SCORE_THRESHOLD } from './recommendations';

const progressWith = (overrides: Partial<Progress> = {}): Progress => ({
  ...getMockProgress('u1', 'de')!,
  completedLessonIds: ['de-a1-1', 'de-a1-2'],
  currentLessonId: 'de-a1-3',
  ...overrides,
});
const attempt = (overrides: Partial<LessonAttempt> = {}): LessonAttempt => ({
  id: 'a1',
  userId: 'u1',
  lessonId: 'de-a1-3',
  targetLanguage: 'de',
  attemptedAt: '2026-10-12T10:00:00.000Z',
  result: { correct: 10, total: 12 },
  completed: true,
  ...overrides,
});
const planWith = (overrides: { minutesToday?: number; dailyGoalMinutes?: number } = {}) => ({
  ...getMockPlan('u1', 'de'),
  ...overrides,
});

const kinds = (input: Parameters<typeof getRecommendations>[0]) => getRecommendations(input).map((r) => r.kind);
const scores = (input: Parameters<typeof getRecommendations>[0]) => getRecommendations(input).map((r) => r.score);

it('is deterministic: same input, same output', () => {
  const input = {
    progress: progressWith(),
    attempts: [attempt()],
    dueVocabulary: 2,
    plan: planWith({ minutesToday: 3 }),
  };
  expect(getRecommendations(input)).toEqual(getRecommendations(input));
});

it('a brand-new learner gets sensible empty-state recommendations from real data', () => {
  const fresh = {
    progress: getMockProgress('u1', 'de')!,
    attempts: [],
    dueVocabulary: 0,
    plan: getMockPlan('u1', 'de'),
  };
  expect(kinds(fresh)).toEqual(['daily-goal', 'continue-lesson']);
  expect(scores(fresh)[0]).toBeGreaterThan(scores(fresh)[1]!);
});

it('the daily-goal rule fires first when the goal is unfinished', () => {
  const input = { progress: progressWith(), attempts: [attempt()], dueVocabulary: 0, plan: planWith({ minutesToday: 5, dailyGoalMinutes: 15 }) };
  const result = getRecommendations(input);
  expect(result[0]!.kind).toBe('daily-goal');
  expect(result[0]!.reason).toContain('10 minutes');
});

it('carries the numbers behind each rule so the UI can write its own copy', () => {
  const goal = getRecommendations({ progress: progressWith(), attempts: [], dueVocabulary: 0, plan: planWith({ minutesToday: 4, dailyGoalMinutes: 15 }) });
  expect(goal[0]!.params).toEqual({ minutes: 11 });

  const due = getRecommendations({ progress: progressWith(), attempts: [], dueVocabulary: 7, plan: planWith({ minutesToday: 15 }) });
  expect(due[0]!.params).toEqual({ count: 7 });

  const retry = getRecommendations({ progress: progressWith(), attempts: [attempt({ result: { correct: 5, total: 12 } })], dueVocabulary: 0, plan: planWith({ minutesToday: 15 }) });
  expect(retry.find((r) => r.kind === 'retry-lesson')!.params).toEqual({ percent: 42 });
});

it('no daily-goal recommendation once today\u2019s goal is met', () => {
  const input = { progress: progressWith(), attempts: [], dueVocabulary: 0, plan: planWith({ minutesToday: 15, dailyGoalMinutes: 15 }) };
  expect(kinds(input)).not.toContain('daily-goal');
});

it('due vocabulary is recommended below the daily goal and weighted by the count', () => {
  const base = { progress: progressWith(), attempts: [], plan: planWith({ minutesToday: 15 }) };
  const one = getRecommendations({ ...base, dueVocabulary: 1 });
  const many = getRecommendations({ ...base, dueVocabulary: 40 });
  expect(one[0]!.kind).toBe('review-due');
  expect(scores({ ...base, dueVocabulary: 40 })[0]!).toBeGreaterThan(scores({ ...base, dueVocabulary: 1 })[0]!);
  expect(many[0]!.reason).toContain('40');
});

it('a practice run (match, listening) is not the lesson score: it neither asks for nor hides a retry', () => {
  const base = { progress: progressWith(), dueVocabulary: 0, plan: planWith({ minutesToday: 15 }) };
  const weakPractice = attempt({ id: 'p1', result: { correct: 1, total: 6 }, completed: false, kind: 'practice' });
  expect(kinds({ ...base, attempts: [attempt(), weakPractice] })).not.toContain('retry-lesson');

  const failedRun = attempt({ result: { correct: 5, total: 12 }, completed: false, kind: 'lesson' });
  const strongPractice = attempt({ id: 'p2', result: { correct: 6, total: 6 }, completed: false, kind: 'practice' });
  const retry = getRecommendations({ ...base, attempts: [failedRun, strongPractice] });
  expect(retry.find((r) => r.kind === 'retry-lesson')!.params).toEqual({ percent: 42 });
});

it('a low-scoring last attempt produces a retry recommendation', () => {
  const input = {
    progress: progressWith(),
    attempts: [attempt({ result: { correct: 5, total: 12 } })],
    dueVocabulary: 0,
    plan: planWith({ minutesToday: 15 }),
  };
  expect(kinds(input)).toContain('retry-lesson');
  expect(RETRY_SCORE_THRESHOLD).toBe(PASS_RATIO); // one threshold: a failed run is exactly a retry
});

it('a completed, high-scoring attempt does not demand a retry but still suggests continuing', () => {
  const input = { progress: progressWith(), attempts: [attempt({ result: { correct: 12, total: 12 } })], dueVocabulary: 0, plan: planWith({ minutesToday: 15 }) };
  expect(kinds(input)).toEqual(['continue-lesson']);
});

it('the unit rule is inert without real units and active when content defines them', () => {
  const without = { progress: progressWith(), attempts: [], dueVocabulary: 0, plan: planWith() };
  expect(kinds(without)).not.toContain('continue-unit');
  expect(hasUnits(lessons.filter((l) => l.targetLanguage === 'de'))).toBe(false);

  const withUnit = [
    ...lessons.filter((l) => l.targetLanguage === 'de').map((l) => (l.id === 'de-a1-3' ? { ...l, unitId: 'unit-1' } : l)),
  ];
  const active = { progress: progressWith(), attempts: [], dueVocabulary: 0, plan: planWith(), lessons: withUnit };
  expect(kinds(active)).toContain('continue-unit');
});
