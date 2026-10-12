import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { STORAGE_KEYS } from '@/constants/app';

export interface Completion {
  correct: number;
  total: number;
  completedAt: string; // ISO date
}

interface CompletionState {
  /** userId -> lessonId -> best result. Local only; a backend replaces this in a later phase. */
  byUser: Record<string, Record<string, Completion>>;
  recordCompletion: (userId: string, lessonId: string, result: Omit<Completion, 'completedAt'>) => void;
}

export const useCompletionStore = create<CompletionState>()(
  persist(
    (set) => ({
      byUser: {},
      recordCompletion: (userId, lessonId, result) =>
        set((state) => {
          const previous = state.byUser[userId]?.[lessonId];
          // Keep the best score so repeating a lesson can never lower the learner's progress.
          const best = previous && previous.correct > result.correct ? previous : { ...result, completedAt: new Date().toISOString() };
          return { byUser: { ...state.byUser, [userId]: { ...state.byUser[userId], [lessonId]: best } } };
        }),
    }),
    { name: STORAGE_KEYS.completions, storage: createJSONStorage(() => AsyncStorage) },
  ),
);
