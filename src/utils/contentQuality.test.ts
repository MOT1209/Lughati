import { languages } from '@/mocks/languages';
import { lessons } from '@/mocks/lessons';
import { vocabulary } from '@/mocks/vocabulary';
import { buildExercises } from '@/utils/exercises';
import { meaningOf } from '@/utils/meaning';
import type { LanguageCode } from '@/types';

/**
 * Automated content-quality gates over the whole bundled course. These catch structural errors
 * (missing or ambiguous meanings, duplicates, wrong answers); they do NOT replace review by a
 * native speaker of each language, which has not happened (see docs/A2_LANGUAGE_REVIEW.md).
 */
const codes = languages.map((l) => l.code) as LanguageCode[];
const targets = languages.filter((l) => l.roles.includes('target')).map((l) => l.code);

describe('course content quality', () => {
  it('every language has the same number of lessons and words', () => {
    const lessonCounts = new Set(targets.map((c) => lessons.filter((l) => l.targetLanguage === c).length));
    const wordCounts = new Set(targets.map((c) => vocabulary.filter((w) => w.targetLanguage === c).length));
    expect(lessonCounts.size).toBe(1);
    expect(wordCounts.size).toBe(1);
  });

  it.each(targets)('%s: every word carries a clean meaning in every other course language', (code) => {
    for (const word of vocabulary.filter((w) => w.targetLanguage === code)) {
      expect(word.term).toBe(word.term.trim());
      expect(word.term.length).toBeGreaterThan(0);
      for (const other of codes.filter((c) => c !== code)) {
        const meaning = word.translations[other];
        expect(typeof meaning).toBe('string');
        expect(meaning).toBe(meaning!.trim());
        expect(meaning!.length).toBeGreaterThan(0);
      }
    }
  });

  it.each(targets)('%s: no repeated word in the course', (code) => {
    const terms = vocabulary.filter((w) => w.targetLanguage === code).map((w) => w.term);
    expect(terms.filter((t, i) => terms.indexOf(t) !== i)).toEqual([]);
  });

  it.each(targets)('%s: no two words of a lesson share a meaning in any source language (an ambiguous quiz answer)', (code) => {
    const problems: string[] = [];
    for (const lesson of lessons.filter((l) => l.targetLanguage === code)) {
      const words = vocabulary.filter((w) => w.lessonId === lesson.id);
      for (const source of codes.filter((c) => c !== code)) {
        const seen = new Map<string, string>();
        for (const word of words) {
          const meaning = meaningOf(word, source).toLowerCase();
          if (seen.has(meaning)) problems.push(`${lesson.id} (${source}): "${meaning}" for ${seen.get(meaning)} and ${word.id}`);
          seen.set(meaning, word.id);
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it.each(targets)('%s: every generated exercise has exactly one correct option and no repeated options', (code) => {
    for (const lesson of lessons.filter((l) => l.targetLanguage === code)) {
      const words = vocabulary.filter((w) => w.lessonId === lesson.id);
      for (const exercise of buildExercises(lesson.id, words)) {
        expect(exercise.options.filter((o) => o === exercise.answer)).toHaveLength(1);
        expect(new Set(exercise.options).size).toBe(exercise.options.length);
        expect(exercise.answer).toBe(exercise.subjectId);
      }
    }
  });
});
