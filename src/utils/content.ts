import type { Exercise, Lesson, Localized, Vocabulary } from '@/types';

/**
 * Validation of a lesson content bundle (lesson + its words + its exercises). Content sources are
 * untrusted input just like storage: a bundle that references things that do not exist would
 * produce broken quizzes, so it is checked before display or processing.
 *
 * Returns a list of human-readable issues; an empty list means the bundle is consistent.
 */

export interface ContentIssue {
  /** Where the problem is, e.g. "exercise id / field". */
  path: string;
  message: string;
}

const localized = (path: string, value: Localized | undefined, issues: ContentIssue[]): void => {
  if (!value) return; // optional fields stay optional
  if (typeof value !== 'object') {
    issues.push({ path, message: 'not a localized record' });
    return;
  }
  for (const locale of ['ar', 'en'] as const) {
    if (typeof value[locale] !== 'string' || value[locale].length === 0) {
      issues.push({ path, message: `missing or empty "${locale}"` });
    }
  }
};

export function validateLessonContent(lesson: Lesson, words: readonly Vocabulary[], exercises: readonly Exercise[]): ContentIssue[] {
  const issues: ContentIssue[] = [];

  localized(`lesson ${lesson.id} title`, lesson.title, issues);
  localized(`lesson ${lesson.id} summary`, lesson.summary, issues);
  localized(`lesson ${lesson.id} instructions`, lesson.instructions, issues);

  const wordsById = new Map<string, Vocabulary>();
  for (const word of words) {
    if (word.lessonId !== lesson.id) {
      issues.push({ path: `word ${word.id}`, message: `lessonId is "${word.lessonId}", not "${lesson.id}"` });
    }
    if (word.targetLanguage !== lesson.targetLanguage) {
      issues.push({ path: `word ${word.id}`, message: `targetLanguage "${word.targetLanguage}" does not match the lesson language "${lesson.targetLanguage}"` });
    }
    if (typeof word.term !== 'string' || word.term.length === 0) {
      issues.push({ path: `word ${word.id}`, message: 'empty term' });
    }
    for (const [locale, meaning] of Object.entries(word.translations)) {
      if (typeof meaning !== 'string' || meaning.length === 0) {
        issues.push({ path: `word ${word.id} translations.${locale}`, message: 'empty meaning' });
      }
    }
    localized(`word ${word.id} note`, word.note, issues);
    if (wordsById.has(word.id)) issues.push({ path: `word ${word.id}`, message: 'duplicate word id' });
    wordsById.set(word.id, word);
  }

  for (const exercise of exercises) {
    const label = `exercise ${exercise.id}`;
    if (exercise.lessonId !== lesson.id) {
      issues.push({ path: label, message: `lessonId is "${exercise.lessonId}", not "${lesson.id}"` });
    }
    if (!wordsById.has(exercise.subjectId)) {
      issues.push({ path: label, message: `subjectId "${exercise.subjectId}" is not a word of this lesson` });
    }
    if (!Array.isArray(exercise.options) || exercise.options.length === 0) {
      issues.push({ path: label, message: 'no options' });
      continue;
    }
    if (new Set(exercise.options).size !== exercise.options.length) {
      issues.push({ path: label, message: 'duplicate options' });
    }
    for (const option of exercise.options) {
      if (!wordsById.has(option)) {
        issues.push({ path: label, message: `option "${option}" is not a word of this lesson` });
      }
    }
    if (!exercise.options.includes(exercise.answer)) {
      issues.push({ path: label, message: `answer "${exercise.answer}" is not among the options` });
    }
    if (!wordsById.has(exercise.answer)) {
      issues.push({ path: label, message: `answer "${exercise.answer}" is not a word of this lesson` });
    }
  }

  return issues;
}
