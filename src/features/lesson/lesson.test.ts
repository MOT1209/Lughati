import { exercises } from '@/mocks/exercises';
import { lessons } from '@/mocks/lessons';
import { getMockProgress } from '@/mocks/progress';
import { useCompletionStore } from '@/store/completionStore';
import { isCorrect, normalizeAnswer } from '@/utils/answer';
import { applyCompletions } from '@/utils/progress';
import type { Exercise } from '@/types';

import { initialSession, sessionReducer } from './session';

const typed: Exercise = { id: 'x', lessonId: 'l', type: 'translate', prompt: { ar: '', en: '' }, answer: 'Ich heiße Sara' };

describe('answer checking', () => {
  it('ignores case, spacing and trailing punctuation', () => {
    expect(isCorrect(typed, '  ich  HEIßE sara. ')).toBe(true);
    expect(isCorrect(typed, 'Ich heiße Sara!')).toBe(true);
  });

  it('does not forgive wrong letters', () => {
    expect(isCorrect(typed, 'Ich heisse Sara')).toBe(false);
    expect(normalizeAnswer('fünf')).not.toBe(normalizeAnswer('funf'));
  });

  it('treats composed and decomposed umlauts as equal', () => {
    expect(normalizeAnswer('fünf')).toBe(normalizeAnswer('fünf'));
  });
});

describe('lesson session reducer', () => {
  const choice: Exercise = { ...typed, type: 'multiple-choice', options: ['a', 'b'], answer: 'a' };

  it('will not check an empty answer', () => {
    expect(sessionReducer(initialSession, { type: 'check', exercise: choice })).toBe(initialSession);
  });

  it('counts a correct answer and locks the input afterwards', () => {
    let s = sessionReducer(initialSession, { type: 'input', value: 'a' });
    s = sessionReducer(s, { type: 'check', exercise: choice });
    expect(s).toMatchObject({ phase: 'checked', lastCorrect: true, correct: 1 });
    expect(sessionReducer(s, { type: 'input', value: 'b' }).input).toBe('a');
    expect(sessionReducer(s, { type: 'check', exercise: choice }).correct).toBe(1);
  });

  it('does not count a wrong answer', () => {
    let s = sessionReducer(initialSession, { type: 'input', value: 'b' });
    s = sessionReducer(s, { type: 'check', exercise: choice });
    expect(s).toMatchObject({ lastCorrect: false, correct: 0 });
  });

  it('moves on, then finishes after the last exercise; cannot skip an unchecked one', () => {
    expect(sessionReducer(initialSession, { type: 'next', total: 2 })).toBe(initialSession);
    let s = sessionReducer(initialSession, { type: 'input', value: 'a' });
    s = sessionReducer(s, { type: 'check', exercise: choice });
    s = sessionReducer(s, { type: 'next', total: 2 });
    expect(s).toMatchObject({ index: 1, input: '', phase: 'answering', lastCorrect: null });
    s = sessionReducer(s, { type: 'input', value: 'a' });
    s = sessionReducer(s, { type: 'check', exercise: choice });
    expect(sessionReducer(s, { type: 'next', total: 2 }).phase).toBe('finished');
  });

  it('restart returns to the initial state', () => {
    expect(sessionReducer({ ...initialSession, index: 3, correct: 2 }, { type: 'restart' })).toBe(initialSession);
  });
});

describe('exercise data', () => {
  it('belongs to existing lessons and has unique ids', () => {
    const lessonIds = new Set(lessons.map((l) => l.id));
    expect(exercises.length).toBeGreaterThan(0);
    for (const e of exercises) expect(lessonIds.has(e.lessonId)).toBe(true);
    expect(new Set(exercises.map((e) => e.id)).size).toBe(exercises.length);
  });

  it('multiple choice always offers the right answer, and nothing is unanswerable', () => {
    for (const e of exercises) {
      expect(e.answer.trim()).not.toBe('');
      if (e.type === 'multiple-choice') expect(e.options).toContain(e.answer);
    }
  });
});

describe('applyCompletions', () => {
  const german = lessons.filter((l) => l.targetLanguage === 'de');
  const base = getMockProgress('u', 'de')!;

  it('is a no-op without results for this language', () => {
    expect(applyCompletions(base, german, {})).toBe(base);
    expect(applyCompletions(base, german, { 'fr-a1-1': { correct: 4, total: 4 } })).toBe(base);
  });

  it('adds completed lessons once, adds XP, and advances the current lesson', () => {
    const result = applyCompletions(base, german, { 'de-a2-1': { correct: 3, total: 4 } });
    expect(result.completedLessonIds).toContain('de-a2-1');
    expect(result.totalXp).toBe(base.totalXp + 30);
    expect(result.currentLessonId).toBe('de-a2-2');
    expect(result.levelId).toBe(base.levelId);
  });

  it('leaves no current lesson when everything is completed', () => {
    const all = Object.fromEntries(german.map((l) => [l.id, { correct: 0, total: 4 }]));
    expect(applyCompletions(base, german, all).currentLessonId).toBeNull();
  });
});

describe('completion store', () => {
  beforeEach(() => useCompletionStore.setState({ byUser: {} }));

  it('keeps results per user', () => {
    const { recordCompletion } = useCompletionStore.getState();
    recordCompletion('a', 'de-a1-1', { correct: 3, total: 4 });
    expect(useCompletionStore.getState().byUser['b']).toBeUndefined();
  });

  it('keeps the best score when a lesson is repeated worse', () => {
    const { recordCompletion } = useCompletionStore.getState();
    recordCompletion('a', 'de-a1-1', { correct: 4, total: 4 });
    recordCompletion('a', 'de-a1-1', { correct: 1, total: 4 });
    expect(useCompletionStore.getState().byUser['a']?.['de-a1-1']?.correct).toBe(4);
    recordCompletion('a', 'de-a1-2', { correct: 1, total: 4 });
    expect(useCompletionStore.getState().byUser['a']?.['de-a1-2']?.correct).toBe(1);
  });
});
