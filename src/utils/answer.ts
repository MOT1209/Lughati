import type { Exercise } from '@/types';

/**
 * Lenient comparison for typed answers: ignores case, surrounding/duplicate spaces, bidi
 * marks and trailing punctuation, but NOT letters, so "fünf" and "funf" stay different.
 */
export function normalizeAnswer(value: string): string {
  return value
    .normalize('NFC')
    .replace(/[\u200E\u200F\u2066-\u2069]/g, '')
    .trim()
    .replace(/[.,!?;:،؟]+$/u, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('de');
}

export function isCorrect(exercise: Exercise, input: string): boolean {
  return normalizeAnswer(input) === normalizeAnswer(exercise.answer);
}

export const XP_PER_CORRECT_ANSWER = 10;
