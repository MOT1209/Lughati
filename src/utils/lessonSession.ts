import type { Exercise } from '@/types';

export interface LessonSession {
  index: number;
  /** Vocabulary id the learner picked for the current exercise, or null before answering. */
  selected: string | null;
  correct: number;
}

export const initialSession: LessonSession = { index: 0, selected: null, correct: 0 };

/** Answering locks the exercise: a second tap on another option is ignored. */
export function answer(session: LessonSession, exercise: Exercise, optionId: string): LessonSession {
  if (session.selected !== null) return session;
  return { ...session, selected: optionId, correct: session.correct + (optionId === exercise.answer ? 1 : 0) };
}

export function next(session: LessonSession): LessonSession {
  return { ...session, index: session.index + 1, selected: null };
}

export function isFinished(session: LessonSession, total: number): boolean {
  return session.index >= total;
}
