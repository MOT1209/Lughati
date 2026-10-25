import type { Exercise, Vocabulary } from '@/types';

export const OPTIONS_PER_EXERCISE = 4;

/** FNV-1a: a small, stable 32-bit hash of a string, used only to seed `seededRandom`. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32: a deterministic generator in [0, 1). Same seed, same sequence, on every device. */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * One exercise about `word`: distractors are drawn from the whole lesson and the answer's position
 * is picked by a generator seeded with the exercise id, so the set is the same on every run
 * (nothing random to test around) yet neither position nor neighbours give the answer away.
 */
function makeExercise(lessonId: string, words: Vocabulary[], type: Exercise['type'], word: Vocabulary, index: number): Exercise {
  const id = `${lessonId}-${type}-${index + 1}`;
  const random = seededRandom(hash(id));
  const others = words.filter((other) => other.id !== word.id).map((other) => other.id);
  for (let i = others.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [others[i], others[j]] = [others[j]!, others[i]!];
  }
  const options = others.slice(0, OPTIONS_PER_EXERCISE - 1);
  options.splice(Math.floor(random() * OPTIONS_PER_EXERCISE), 0, word.id);
  return { id, lessonId, type, subjectId: word.id, options, answer: word.id };
}

/**
 * Builds a deterministic exercise set from a lesson's vocabulary: every word is asked once as
 * "pick the meaning" and once as "pick the word". Needs at least OPTIONS_PER_EXERCISE words; with
 * fewer it returns no exercises.
 */
export function buildExercises(lessonId: string, words: Vocabulary[]): Exercise[] {
  if (words.length < OPTIONS_PER_EXERCISE) return [];
  return [
    ...words.map((word, index) => makeExercise(lessonId, words, 'multiple-choice', word, index)),
    ...words.map((word, index) => makeExercise(lessonId, words, 'translate', word, index)),
  ];
}

/**
 * Listening practice: every word once as "hear it, pick the written word". Same deterministic
 * options as the quiz (ids `<lesson>-listen-<n>`); empty with fewer than OPTIONS_PER_EXERCISE words.
 */
export function buildListeningExercises(lessonId: string, words: Vocabulary[]): Exercise[] {
  if (words.length < OPTIONS_PER_EXERCISE) return [];
  return words.map((word, index) => makeExercise(lessonId, words, 'listen', word, index));
}

export function scoreRatio(result: { correct: number; total: number }): number {
  return result.total === 0 ? 0 : result.correct / result.total;
}
