import type { Exercise, Vocabulary } from '@/types';

export const OPTIONS_PER_EXERCISE = 4;

/**
 * Builds a deterministic exercise set from a lesson's vocabulary: every word is asked once as
 * "pick the meaning" and once as "pick the word". Distractors are the neighbouring words and the
 * correct option rotates through the positions, so there is no randomness to test around.
 * Needs at least OPTIONS_PER_EXERCISE words; with fewer it returns no exercises.
 */
export function buildExercises(lessonId: string, words: Vocabulary[]): Exercise[] {
  const count = words.length;
  if (count < OPTIONS_PER_EXERCISE) return [];

  const make = (type: Exercise['type'], word: Vocabulary, index: number, shift = 0): Exercise => {
    const distractors = Array.from({ length: OPTIONS_PER_EXERCISE - 1 }, (_, step) => words[(index + step + 1) % count]!.id);
    const options = [...distractors];
    options.splice((index + shift) % OPTIONS_PER_EXERCISE, 0, word.id);
    return { id: `${lessonId}-${type}-${index + 1}`, lessonId, type, subjectId: word.id, options, answer: word.id };
  };

  return [
    ...words.map((word, index) => make('multiple-choice', word, index)),
    ...words.map((word, index) => make('translate', word, index, 2)), // shifted so positions differ from round 1
  ];
}

export function scoreRatio(result: { correct: number; total: number }): number {
  return result.total === 0 ? 0 : result.correct / result.total;
}
