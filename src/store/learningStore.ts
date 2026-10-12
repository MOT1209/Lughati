import { create } from 'zustand';

import type { LanguageCode } from '@/types';

interface LearningState {
  /** Overrides the user's default target language. Memory only (not persisted in Phase 1). */
  selectedTarget: LanguageCode | null;
  selectTarget: (code: LanguageCode) => void;
  reset: () => void;
}

export const useLearningStore = create<LearningState>()((set) => ({
  selectedTarget: null,
  selectTarget: (selectedTarget) => set({ selectedTarget }),
  reset: () => set({ selectedTarget: null }),
}));
