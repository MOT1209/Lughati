import type { Exercise } from '@/types';
import { isCorrect } from '@/utils/answer';

export type SessionPhase = 'answering' | 'checked' | 'finished';

export interface SessionState {
  index: number;
  input: string;
  phase: SessionPhase;
  /** Result of the last check; null until the learner checks the current exercise. */
  lastCorrect: boolean | null;
  correct: number;
}

export type SessionAction =
  | { type: 'input'; value: string }
  | { type: 'check'; exercise: Exercise }
  | { type: 'next'; total: number }
  | { type: 'restart' };

export const initialSession: SessionState = { index: 0, input: '', phase: 'answering', lastCorrect: null, correct: 0 };

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'input':
      // The answer is locked once checked, so a result cannot be changed afterwards.
      return state.phase === 'answering' ? { ...state, input: action.value } : state;
    case 'check': {
      if (state.phase !== 'answering' || state.input.trim() === '') return state;
      const right = isCorrect(action.exercise, state.input);
      return { ...state, phase: 'checked', lastCorrect: right, correct: state.correct + (right ? 1 : 0) };
    }
    case 'next':
      if (state.phase !== 'checked') return state;
      return state.index + 1 >= action.total
        ? { ...state, phase: 'finished' }
        : { ...state, index: state.index + 1, input: '', phase: 'answering', lastCorrect: null };
    case 'restart':
      return initialSession;
  }
}
