import { languages } from '@/mocks/languages';
import { lessons } from '@/mocks/lessons';
import { levels } from '@/mocks/levels';
import { arabicMeanings, vocabulary } from '@/mocks/vocabulary';
import type { Progress } from '@/types';

import { isolate, isolateLtr } from './bidi';
import { isolateTerm, meaningLanguage, meaningOf } from './meaning';
import { buildExercises, OPTIONS_PER_EXERCISE } from './exercises';
import { answer, initialSession, isFinished, next } from './lessonSession';
import { applyLessonCompletion, isPassed, lessonXp, PASS_RATIO, XP_LESSON_BONUS, XP_PER_CORRECT_ANSWER } from './progression';

const wordsOf = (lessonId: string) => vocabulary.filter((w) => w.lessonId === lessonId);
const targets = languages.filter((l) => l.roles.includes('target')).map((l) => l.code);

describe('vocabulary data', () => {
  it.each(lessons.map((l) => l.id))('%s has enough distinct words with Arabic meanings', (id) => {
    const words = wordsOf(id);
    expect(words.length).toBeGreaterThanOrEqual(OPTIONS_PER_EXERCISE);
    expect(new Set(words.map((w) => w.term)).size).toBe(words.length);
    expect(new Set(words.map((w) => meaningOf(w))).size).toBe(words.length);
    for (const word of words) {
      expect(meaningOf(word).trim()).toBeTruthy();
      expect(word.targetLanguage).toBe(lessons.find((l) => l.id === id)!.targetLanguage);
    }
  });

  it('every language has the same shape: 10 lessons of 6 items matching the Arabic meanings', () => {
    expect(arabicMeanings).toHaveLength(10);
    for (const code of targets) {
      for (const [index, meanings] of arabicMeanings.entries()) {
        const words = wordsOf(`${code}-a1-${index + 1}`);
        // The Arabic course lists the Arabic words themselves; everyone else lists Arabic meanings.
        expect(words.map((w) => (code === 'ar' ? w.term : (w.translations.ar ?? '')))).toEqual(meanings);
      }
    }
  });

  it('every target language has vocabulary for every lesson, and ids are unique', () => {
    for (const code of targets) {
      for (const lesson of lessons.filter((l) => l.targetLanguage === code)) {
        expect(wordsOf(lesson.id).length).toBeGreaterThan(0);
      }
    }
    expect(new Set(vocabulary.map((w) => w.id)).size).toBe(vocabulary.length);
  });
});

describe('meaning language', () => {
  it('shows Arabic meanings to everyone except learners of Arabic, who get English', () => {
    expect(meaningLanguage('de')).toBe('ar');
    expect(meaningLanguage('ar')).toBe('en');
    expect(meaningOf(wordsOf('ar-a1-1')[0]!)).toBe('Hello');
    expect(meaningOf(wordsOf('de-a1-1')[0]!)).toBe('مرحباً');
  });

  it("uses the learner's own language when one is chosen", () => {
    expect(meaningLanguage('de', 'es')).toBe('es');
    expect(meaningOf(wordsOf('de-a1-1')[0]!, 'es')).toBe('Hola');
    expect(meaningOf(wordsOf('ar-a1-1')[0]!, 'tr')).toBe('Merhaba');
    // Own language equal to the learned one cannot give a meaning: fall back.
    expect(meaningLanguage('de', 'de')).toBe('ar');
    expect(meaningOf(wordsOf('de-a1-1')[0]!, 'de')).toBe('مرحباً');
  });

  it('gives every word a meaning in every other course language', () => {
    const codes = ['ar', 'de', 'en', 'es', 'fr', 'tr'] as const;
    for (const word of vocabulary) {
      for (const code of codes) {
        if (code === word.targetLanguage) expect(word.translations[code]).toBeUndefined();
        else expect(word.translations[code]?.trim()).toBeTruthy();
      }
    }
  });

  it('isolates Arabic words as RTL and other target words as LTR', () => {
    expect(isolateTerm(wordsOf('ar-a1-1')[0]!)).toBe(isolate('مرحباً'));
    expect(isolateTerm(wordsOf('de-a1-1')[0]!)).toBe(isolateLtr('Hallo'));
  });

  it('the Arabic course is built from the English course meanings in the same order', () => {
    const english = wordsOf('en-a1-5').map((w) => w.term);
    expect(wordsOf('ar-a1-5').map((w) => w.translations.en)).toEqual(english);
  });
});

describe('buildExercises', () => {
  const words = wordsOf('de-a1-1');
  const exercises = buildExercises('de-a1-1', words);

  it('asks every word twice: meaning, then word', () => {
    expect(exercises).toHaveLength(words.length * 2);
    expect(exercises.filter((e) => e.type === 'multiple-choice')).toHaveLength(words.length);
    expect(exercises.filter((e) => e.type === 'translate')).toHaveLength(words.length);
  });

  it('every exercise offers distinct options that contain the answer', () => {
    for (const exercise of exercises) {
      expect(exercise.options).toHaveLength(OPTIONS_PER_EXERCISE);
      expect(new Set(exercise.options).size).toBe(OPTIONS_PER_EXERCISE);
      expect(exercise.options).toContain(exercise.answer);
      expect(exercise.answer).toBe(exercise.subjectId);
    }
  });

  it('is deterministic and does not always put the answer first', () => {
    expect(buildExercises('de-a1-1', words)).toEqual(exercises);
    expect(new Set(exercises.map((e) => e.options.indexOf(e.answer))).size).toBeGreaterThan(1);
  });

  it('does not give the answer away by its position or by fixed neighbours', () => {
    const all = lessons.flatMap((lesson) => buildExercises(lesson.id, wordsOf(lesson.id)));
    const positions = all.map((e) => e.options.indexOf(e.answer));
    // Not the old cyclic pattern (index % 4) …
    const cyclic = all.every((e) => {
      const index = Number(e.id.split('-').pop()) - 1;
      return e.options.indexOf(e.answer) === (index + (e.type === 'translate' ? 2 : 0)) % OPTIONS_PER_EXERCISE;
    });
    expect(cyclic).toBe(false);
    // … and every position is used often enough that guessing one is no strategy.
    for (let position = 0; position < OPTIONS_PER_EXERCISE; position += 1) {
      const share = positions.filter((p) => p === position).length / all.length;
      expect(share).toBeGreaterThan(0.15);
      expect(share).toBeLessThan(0.35);
    }
    // Distractors are not always the next words in the list.
    const neighbours = all.filter((e) => {
      const ids = wordsOf(e.lessonId).map((w) => w.id);
      const at = ids.indexOf(e.answer);
      const next = Array.from({ length: OPTIONS_PER_EXERCISE - 1 }, (_, step) => ids[(at + step + 1) % ids.length]);
      return e.options.filter((id) => id !== e.answer).every((id) => next.includes(id));
    });
    expect(neighbours.length).toBeLessThan(all.length / 2);
  });

  it('has unique ids and returns nothing when there are too few words', () => {
    expect(new Set(exercises.map((e) => e.id)).size).toBe(exercises.length);
    expect(buildExercises('x', words.slice(0, 3))).toEqual([]);
  });
});

describe('lesson session', () => {
  const exercise = buildExercises('de-a1-1', wordsOf('de-a1-1'))[0]!;
  const wrong = exercise.options.find((id) => id !== exercise.answer)!;

  it('counts a correct answer and locks the exercise', () => {
    const done = answer(initialSession, exercise, exercise.answer);
    expect(done).toMatchObject({ selected: exercise.answer, correct: 1 });
    expect(answer(done, exercise, wrong)).toBe(done); // second tap ignored
  });

  it('does not count a wrong answer', () => {
    expect(answer(initialSession, exercise, wrong).correct).toBe(0);
  });

  it('next clears the selection and finishes after the last exercise', () => {
    const moved = next(answer(initialSession, exercise, wrong));
    expect(moved).toMatchObject({ index: 1, selected: null });
    expect(isFinished(moved, 2)).toBe(false);
    expect(isFinished(next(moved), 2)).toBe(true);
  });
});

describe('applyLessonCompletion', () => {
  const german = lessons.filter((l) => l.targetLanguage === 'de');
  const base: Progress = {
    userId: 'u1',
    targetLanguage: 'de',
    levelId: 'A1',
    completedLessonIds: [],
    currentLessonId: 'de-a1-1',
    levelProgress: 0,
    totalXp: 100,
    wordsLearned: 10,
    minutesLearned: 20,
  };
  const perfect = { correct: 12, total: 12 };
  const complete = (progress: Progress, id: string, result = perfect) =>
    applyLessonCompletion(progress, german.find((l) => l.id === id)!, german, levels, result, 6);

  it('marks the lesson done, moves to the next one and updates counters', () => {
    const after = complete(base, 'de-a1-1');
    expect(after.completedLessonIds).toEqual(['de-a1-1']);
    expect(after.currentLessonId).toBe('de-a1-2');
    expect(after.levelId).toBe('A1');
    expect(after.levelProgress).toBeCloseTo(0.1, 2);
    expect(after.totalXp).toBe(100 + 12 * XP_PER_CORRECT_ANSWER + XP_LESSON_BONUS);
    expect(after.wordsLearned).toBe(16);
    expect(after.minutesLearned).toBe(20 + german[0]!.estimatedMinutes);
  });

  it('raises the level and clears the current lesson when the last lesson of a level is done', () => {
    const almost = { ...base, completedLessonIds: german.slice(0, 9).map((l) => l.id), currentLessonId: 'de-a1-10' };
    const after = complete(almost, 'de-a1-10');
    expect(after.levelId).toBe('A2');
    expect(after.currentLessonId).toBeNull(); // no A2 lessons exist yet
    expect(after.levelProgress).toBe(0);
  });

  it('is structurally idempotent on replay: no new words, XP still counts', () => {
    const once = complete(base, 'de-a1-1');
    const twice = complete(once, 'de-a1-1', { correct: 9, total: 10 });
    expect(twice.completedLessonIds).toEqual(once.completedLessonIds);
    expect(twice.currentLessonId).toBe(once.currentLessonId);
    expect(twice.wordsLearned).toBe(once.wordsLearned);
    expect(twice.totalXp).toBe(once.totalXp + 9 * XP_PER_CORRECT_ANSWER + XP_LESSON_BONUS);
  });

  it('does not complete the lesson below the pass mark, but still counts XP (no bonus) and minutes', () => {
    const after = complete(base, 'de-a1-1', { correct: 0, total: 12 });
    expect(after.completedLessonIds).toEqual([]);
    expect(after.currentLessonId).toBe('de-a1-1');
    expect(after.levelProgress).toBe(0);
    expect(after.wordsLearned).toBe(base.wordsLearned);
    expect(after.totalXp).toBe(base.totalXp);
    expect(after.minutesLearned).toBe(20 + german[0]!.estimatedMinutes);

    const close = complete(base, 'de-a1-1', { correct: 8, total: 12 }); // 67%
    expect(close.completedLessonIds).toEqual([]);
    expect(close.totalXp).toBe(base.totalXp + 8 * XP_PER_CORRECT_ANSWER);
  });

  it('a failed run never raises the level, even on the last lesson of the level', () => {
    const almost = { ...base, completedLessonIds: german.slice(0, 9).map((l) => l.id), currentLessonId: 'de-a1-10' };
    const after = complete(almost, 'de-a1-10', { correct: 3, total: 12 });
    expect(after.levelId).toBe('A1');
    expect(after.currentLessonId).toBe('de-a1-10');
  });

  it('a failed replay keeps an already completed lesson completed', () => {
    const once = complete(base, 'de-a1-1');
    const failed = complete(once, 'de-a1-1', { correct: 1, total: 12 });
    expect(failed.completedLessonIds).toEqual(['de-a1-1']);
    expect(failed.currentLessonId).toBe('de-a1-2');
    expect(failed.totalXp).toBe(once.totalXp + XP_PER_CORRECT_ANSWER);
  });
});

describe('pass mark', () => {
  it('passes at exactly PASS_RATIO and gives the bonus only on a pass', () => {
    expect(PASS_RATIO).toBe(0.7);
    expect(isPassed({ correct: 7, total: 10 })).toBe(true);
    expect(isPassed({ correct: 8, total: 12 })).toBe(false);
    expect(isPassed({ correct: 9, total: 12 })).toBe(true);
    expect(isPassed({ correct: 0, total: 0 })).toBe(false);
    expect(lessonXp({ correct: 9, total: 12 })).toBe(9 * XP_PER_CORRECT_ANSWER + XP_LESSON_BONUS);
    expect(lessonXp({ correct: 8, total: 12 })).toBe(8 * XP_PER_CORRECT_ANSWER);
  });
});
