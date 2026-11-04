import type { GeneratedExercise } from './types';

const norm = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .normalize('NFC')
    .replace(/[ً-ْـ]/g, '')
    .replace(/[.,!?;:"“”„«»]/g, '')
    .replace(/\s+/g, ' ');

/** Exercises with options compare the chosen option; free-text answers compare normalized text. */
export function isCorrectAnswer(exercise: GeneratedExercise, response: string): boolean {
  return norm(response) === norm(exercise.answer);
}
