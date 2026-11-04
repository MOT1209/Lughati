import type { SupabaseClient } from '@supabase/supabase-js';

import { compareWords as serverDiff } from '../../../supabase/functions/ai-gateway/diff';
import type { Lesson, LessonAttempt, LearningPlan, Progress } from '@/types';
import {
  AIError,
  askTutor,
  buildAIContext,
  buildPlannerStats,
  coachPronunciation,
  correctWriting,
  generateExercises,
  getAIGateway,
  localAdvice,
  planLearning,
  registerAIGateway,
  RemoteAIGateway,
  sendSpeakingTurn,
  UnavailableAIGateway,
  weakTopicsFrom,
  type AIGateway,
} from '.';
import { isCorrectAnswer } from './quizCheck';

const ctx = buildAIContext({ learning: 'de', explanation: 'ar', level: 'A1' });
const gatewayReturning = (data: unknown): AIGateway & { call: jest.Mock } => ({ id: 'test', call: jest.fn(async () => data) });
afterEach(() => registerAIGateway(null));

describe('learner context', () => {
  it('carries languages, level and hints only: no identity, bounded size', () => {
    const c = buildAIContext({ learning: 'de', explanation: 'ar', level: 'A2', weakTopics: ['a', 'b', 'c', 'd', 'e', 'f', 'g'], goal: 'x'.repeat(500) });
    expect(Object.keys(c).sort()).toEqual(['explanationLanguage', 'goal', 'learningLanguage', 'level', 'weakTopics']);
    expect(c.weakTopics).toHaveLength(5);
    expect(c.goal).toHaveLength(120);
    expect(buildAIContext({ learning: 'de', explanation: 'ar', level: 'A1' })).toEqual({ learningLanguage: 'de', explanationLanguage: 'ar', level: 'A1' });
  });
});

describe('feature services (gateway mocked)', () => {
  it('tutor: cleans input, sends the conversation id, and returns the validated reply', async () => {
    const g = gatewayReturning({ text: 'Der Akkusativ …', conversationId: 'c1', source: 'cache' });
    registerAIGateway(g);
    const reply = await askTutor(ctx, '  اشرح Akkusativ\u0007  ', 'c0');
    expect(g.call).toHaveBeenCalledWith('tutor', ctx, { message: 'اشرح Akkusativ', conversationId: 'c0' });
    expect(reply).toEqual({ text: 'Der Akkusativ …', conversationId: 'c1', source: 'cache' });
  });
  it.each([[''], ['   '], ['x'.repeat(801)]])('rejects unusable input locally without calling the gateway (%#)', async (text) => {
    const g = gatewayReturning({ text: 'x' });
    registerAIGateway(g);
    await expect(askTutor(ctx, text)).rejects.toMatchObject({ code: 'invalid' });
    expect(g.call).not.toHaveBeenCalled();
  });
  it('rejects a malformed gateway answer instead of showing it', async () => {
    registerAIGateway(gatewayReturning({ nope: true }));
    await expect(askTutor(ctx, 'hi')).rejects.toMatchObject({ code: 'invalid_output' });
    await expect(correctWriting(ctx, 'hi')).rejects.toMatchObject({ code: 'invalid_output' });
    await expect(sendSpeakingTurn(ctx, 'hi', 'x', 'normal')).rejects.toMatchObject({ code: 'invalid_output' });
  });
  it('speaking: keeps correction and vocabulary, drops malformed vocabulary entries', async () => {
    registerAIGateway(gatewayReturning({ reply: 'Guten Tag!', correction: { original: 'a', corrected: 'b', explanation: 'c' }, vocabulary: [{ term: 'Tag', meaning: 'day' }, { term: 5 }], conversationId: 'c1' }));
    const r = await sendSpeakingTurn(ctx, 'Hallo', 'Restaurant', 'beginner');
    expect(r.correction).toEqual({ original: 'a', corrected: 'b', explanation: 'c' });
    expect(r.vocabulary).toEqual([{ term: 'Tag', meaning: 'day' }]);
  });
  it('writing: returns the structured feedback', async () => {
    registerAIGateway(gatewayReturning({ originalText: 'Ich bin gehen Schule', correctedText: 'Ich gehe zur Schule', language: 'de', level: 'A1', corrections: [{ original: 'bin gehen', corrected: 'gehe', explanation: 'present tense' }], improvedVersion: 'Ich gehe zur Schule.' }));
    const r = await correctWriting(ctx, 'Ich bin gehen Schule');
    expect(r.corrections[0]!.corrected).toBe('gehe');
    expect(r.improvedVersion).toBe('Ich gehe zur Schule.');
  });
  it('quiz: refuses an exercise whose answer is not among its options', async () => {
    const ex = { id: 'e1', type: 'multiple_choice', question: 'q', options: ['a', 'b', 'c'], answer: 'a', explanation: 'x', difficulty: 'easy', topic: 't' };
    registerAIGateway(gatewayReturning({ exercises: [ex], source: 'cache' }));
    expect(await generateExercises(ctx, 'food', 'multiple_choice')).toMatchObject({ source: 'cache', exercises: [{ id: 'e1' }] });
    registerAIGateway(gatewayReturning({ exercises: [{ ...ex, answer: 'z' }] }));
    await expect(generateExercises(ctx, 'food', 'multiple_choice')).rejects.toMatchObject({ code: 'invalid_output' });
    registerAIGateway(gatewayReturning({ exercises: [] }));
    await expect(generateExercises(ctx, 'food', 'multiple_choice')).rejects.toMatchObject({ code: 'invalid_output' });
  });
  it('quiz answers compare normalized text, ignoring case, punctuation and Arabic diacritics', () => {
    const ex = { id: 'e', type: 'translation', question: 'q', options: null, answer: 'Ich gehe zur Schule.', explanation: '', difficulty: 'easy', topic: 't' } as const;
    expect(isCorrectAnswer(ex, ' ich gehe zur schule ')).toBe(true);
    expect(isCorrectAnswer(ex, 'ich gehe Schule')).toBe(false);
    expect(isCorrectAnswer({ ...ex, answer: 'مَرْحَباً' }, 'مرحباً')).toBe(true);
  });
  it('pronunciation: always carries the text-only limitation, even if the server omitted it', async () => {
    registerAIGateway(gatewayReturning({ diff: { matched: [], missing: ['zur'], substituted: [], extra: [], matchRatio: 0.5 }, tips: ['Say it slowly', 5], practiceWords: ['zur'], limitation: 'accurate_score' }));
    const r = await coachPronunciation(ctx, 'Ich gehe zur Schule', 'ich gehe Schule');
    expect(r.limitation).toBe('text_comparison_only');
    expect(r.tips).toEqual(['Say it slowly']);
  });
  it('planner: validates the plan', async () => {
    registerAIGateway(gatewayReturning({ summary: 's', dailyTips: ['t'], weeklyPlan: [{ day: 'Mon', focus: 'f', minutes: 15 }] }));
    expect((await planLearning(ctx, { completedLessons: 1, totalLessons: 20, accuracyPercent: null, streakDays: 0, dueReviews: 0, minutesToday: 0, dailyGoalMinutes: 15, weakTopics: [] }, 'weekly')).weeklyPlan).toHaveLength(1);
    registerAIGateway(gatewayReturning({ summary: 's', dailyTips: ['t'], weeklyPlan: [{ day: 'Mon' }] }));
    await expect(planLearning(ctx, { completedLessons: 0, totalLessons: 0, accuracyPercent: null, streakDays: 0, dueReviews: 0, minutesToday: 0, dailyGoalMinutes: 15, weakTopics: [] }, 'daily')).rejects.toMatchObject({ code: 'invalid_output' });
  });
});

describe('gateway client', () => {
  const client = (result: unknown) => ({ functions: { invoke: jest.fn().mockResolvedValue(result) } }) as unknown as SupabaseClient;
  const call = (c: SupabaseClient) => new RemoteAIGateway(c).call('tutor', ctx, { message: 'hi' });
  it('sends only feature, context and payload to ai-gateway', async () => {
    const c = client({ data: { text: 'x' }, error: null });
    await call(c);
    expect(c.functions.invoke).toHaveBeenCalledWith('ai-gateway', { body: { feature: 'tutor', context: ctx, payload: { message: 'hi' } } });
  });
  it.each([[429, 'rate_limited'], [503, 'unavailable'], [502, 'invalid_output'], [401, 'auth'], [400, 'invalid'], [404, 'not_found'], [504, 'timeout'], [500, 'unknown']])('HTTP %s → %s', async (status, code) => {
    await expect(call(client({ data: null, error: { name: 'FunctionsHttpError', context: { status } } }))).rejects.toMatchObject({ code });
  });
  it('maps transport failures to network and a hanging call to timeout', async () => {
    await expect(call(client({ data: null, error: { name: 'FunctionsFetchError' } }))).rejects.toMatchObject({ code: 'network' });
    jest.useFakeTimers();
    const hang = { functions: { invoke: jest.fn(() => new Promise(() => {})) } } as unknown as SupabaseClient;
    const assertion = expect(call(hang)).rejects.toMatchObject({ code: 'timeout' });
    await jest.advanceTimersByTimeAsync(31_000);
    await assertion;
    jest.useRealTimers();
  });
  it('without a backend every AI feature says "unavailable" and nothing is faked', async () => {
    expect(getAIGateway()).toBeInstanceOf(UnavailableAIGateway);
    await expect(askTutor(ctx, 'hi')).rejects.toBeInstanceOf(AIError);
    await expect(askTutor(ctx, 'hi')).rejects.toMatchObject({ code: 'unavailable' });
  });
});

const lesson = (id: string, en: string): Lesson => ({ id, targetLanguage: 'de', levelId: 'A1', title: { ar: en, en }, summary: { ar: '', en: '' }, order: 1, estimatedMinutes: 8 });
const attempt = (lessonId: string, correct: number, total: number, kind: 'lesson' | 'practice' = 'lesson'): LessonAttempt => ({ id: `${lessonId}-${correct}-${kind}`, userId: 'u', lessonId, targetLanguage: 'de', attemptedAt: '2026-11-01T00:00:00Z', result: { correct, total }, completed: correct / total >= 0.7, kind });

describe('learning planner data (plain app logic, no model)', () => {
  const lessons = [lesson('de-a1-1', 'Greetings'), lesson('de-a1-2', 'Numbers'), lesson('de-a1-3', 'Colours')];
  it('finds weak topics from the best lesson run, ignoring practice runs, weakest first', () => {
    const attempts = [attempt('de-a1-1', 2, 6), attempt('de-a1-1', 6, 6), attempt('de-a1-2', 1, 6), attempt('de-a1-3', 0, 6, 'practice')];
    expect(weakTopicsFrom(attempts, lessons)).toEqual(['Numbers']); // Greetings was passed later; the practice run does not count
    expect(weakTopicsFrom([], lessons)).toEqual([]);
  });
  const progress = { userId: 'u', targetLanguage: 'de', levelId: 'A1', completedLessonIds: ['de-a1-1'], currentLessonId: 'de-a1-2', levelProgress: 0.1, totalXp: 0, wordsLearned: 0, minutesLearned: 0 } as Progress;
  const plan = { userId: 'u', targetLanguage: 'de', dailyGoalMinutes: 15, minutesToday: 5 } as LearningPlan;
  it('computes statistics locally and handles an empty history without inventing data', () => {
    const stats = buildPlannerStats({ progress, plan, streak: { userId: 'u', days: 3 }, attempts: [attempt('de-a1-1', 5, 6), attempt('de-a1-2', 3, 6)], lessons, dueReviews: 4 });
    expect(stats).toMatchObject({ completedLessons: 1, totalLessons: 3, accuracyPercent: 67, streakDays: 3, dueReviews: 4, minutesToday: 5, dailyGoalMinutes: 15 });
    const empty = buildPlannerStats({ progress: null, plan: { ...plan, minutesToday: 0 }, streak: { userId: 'u', days: 0 }, attempts: [], lessons: [], dueReviews: 0 });
    expect(empty).toMatchObject({ completedLessons: 0, totalLessons: 0, accuracyPercent: null, weakTopics: [] });
  });
  it('gives deterministic local advice: start, reviews, goal minutes, weak topics, or on-track', () => {
    expect(localAdvice({ completedLessons: 0, totalLessons: 20, accuracyPercent: null, streakDays: 0, dueReviews: 0, minutesToday: 15, dailyGoalMinutes: 15, weakTopics: [] })).toEqual([{ kind: 'start' }]);
    expect(localAdvice({ completedLessons: 2, totalLessons: 20, accuracyPercent: 80, streakDays: 1, dueReviews: 3, minutesToday: 5, dailyGoalMinutes: 15, weakTopics: ['Numbers', 'Colours', 'Food'] })).toEqual([
      { kind: 'review-due', count: 3 },
      { kind: 'daily-goal', minutes: 10 },
      { kind: 'weak-topic', topic: 'Numbers' },
      { kind: 'weak-topic', topic: 'Colours' },
    ]);
    expect(localAdvice({ completedLessons: 2, totalLessons: 20, accuracyPercent: 90, streakDays: 1, dueReviews: 0, minutesToday: 20, dailyGoalMinutes: 15, weakTopics: [] })).toEqual([{ kind: 'on-track' }]);
  });
});

describe('server and app agree on the text comparison used for pronunciation', () => {
  it('the server comparison treats the cases the app UI describes the same way', () => {
    expect(serverDiff('Ich gehe zur Schule', 'ich gehe Schule').missing).toEqual(['zur']);
  });
});
