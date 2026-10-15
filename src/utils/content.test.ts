import { languages } from '@/mocks/languages';
import { lessons } from '@/mocks/lessons';
import { vocabulary } from '@/mocks/vocabulary';

import { buildExercises } from './exercises';
import { validateLessonContent } from './content';
import type { Exercise, Lesson, Vocabulary } from '@/types';

const targets = languages.filter((l) => l.roles.includes('target')).map((l) => l.code);

describe('validateLessonContent against the whole bundled course', () => {
  it.each(targets)('%s: every lesson bundle is consistent', (code) => {
    for (const lesson of lessons.filter((l) => l.targetLanguage === code)) {
      const words = vocabulary.filter((w) => w.lessonId === lesson.id);
      const issues = validateLessonContent(lesson, words, buildExercises(lesson.id, words));
      expect(issues).toEqual([]);
    }
  });
});

describe('validateLessonContent rejects malformed bundles', () => {
  const lesson = lessons.find((l) => l.id === 'de-a1-1')!;
  const words = vocabulary.filter((w) => w.lessonId === 'de-a1-1');
  const exercises: Exercise[] = buildExercises('de-a1-1', words);

  it('a broken exercise: foreign option, subject and answer', () => {
    const bad: Exercise[] = [{ ...exercises[0]!, options: ['ghost', exercises[0]!.answer], answer: 'ghost', subjectId: 'ghost' }];
    const issues = validateLessonContent(lesson, words, bad);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.some((i) => i.message.includes('option "ghost"'))).toBe(true);
    expect(issues.some((i) => i.message.includes('answer "ghost"'))).toBe(true);
    expect(issues.some((i) => i.message.includes('subjectId "ghost"'))).toBe(true);
  });

  it('a word of another language does not pass', () => {
    const spanishWord = { ...words[0]!, id: 'spa-x', targetLanguage: 'es' } as Vocabulary;
    const issues = validateLessonContent(lesson, [...words, spanishWord], []);
    expect(issues.some((i) => i.message.includes('does not match the lesson language'))).toBe(true);
  });

  it('duplicate word ids fail', () => {
    const issues = validateLessonContent(lesson, [words[0]!, words[0]!], []);
    expect(issues.some((i) => i.message.includes('duplicate word id'))).toBe(true);
  });

  it('an answer outside the options fails even when the word exists', () => {
    const bad: Exercise[] = [{ ...exercises[0]!, options: exercises[0]!.options.filter((o) => o !== exercises[0]!.answer) }];
    const issues = validateLessonContent(lesson, words, bad);
    expect(issues.some((i) => i.message.includes('is not among the options'))).toBe(true);
  });

  it('missing lesson fields surface as issues', () => {
    const broken = { ...lesson, title: { ar: 'فقط عربي' } } as unknown as Lesson;
    const issues = validateLessonContent(broken, words, exercises);
    expect(issues.some((i) => i.path.includes('title') && i.message.includes('"en"'))).toBe(true);
  });
});
