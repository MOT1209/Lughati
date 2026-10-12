import { create } from 'zustand';

import type { LanguageCode } from '@/types';

interface LearningState {
  /** Overrides the user's default target language. Memory only (not persisted in Phase 1). */
  selectedTarget: LanguageCode | null;
  /** Bumped whenever progress changes so screens showing it reload. */
  progressVersion: number;
  selectTarget: (code: LanguageCode) => void;
  notifyProgressChanged: () => void;
  reset: () => void;
}

export const useLearningStore = create<LearningState>()((set) => ({
  selectedTarget: null,
  progressVersion: 0,
  selectTarget: (selectedTarget) => set({ selectedTarget }),
  notifyProgressChanged: () => set((s) => ({ progressVersion: s.progressVersion + 1 })),
  reset: () => set({ selectedTarget: null }),
}));
