import { create } from 'zustand';

import { getRepositories } from '@/services/repositories';
import type { LanguageCode, LearningProfile } from '@/types';

interface LearningState {
  /** Account the profile below belongs to. */
  userId: string | null;
  /** The learner's own and target language, persisted per account. Null until they chose. */
  profile: LearningProfile | null;
  /** False until the signed-in account's profile was read; the splash waits for it. */
  profileLoaded: boolean;
  /** Bumped whenever progress changes so screens showing it reload. */
  progressVersion: number;
  loadProfile: (userId: string) => Promise<void>;
  /** Saves first, then publishes: a failed write leaves the current choice in place. */
  saveProfile: (profile: LearningProfile) => Promise<void>;
  /** Switches the language being learned, keeping the learner's own language. */
  selectTarget: (code: LanguageCode) => Promise<void>;
  notifyProgressChanged: () => void;
  reset: () => void;
}

export const useLearningStore = create<LearningState>()((set, get) => ({
  userId: null,
  profile: null,
  profileLoaded: false,
  progressVersion: 0,
  loadProfile: async (userId) => {
    set({ userId, profile: null, profileLoaded: false });
    // An unreadable profile counts as "not chosen yet": the learner is asked again.
    const profile = await getRepositories()
      .profiles.get(userId)
      .catch(() => null);
    if (get().userId === userId) set({ profile, profileLoaded: true });
  },
  saveProfile: async (profile) => {
    const { userId } = get();
    if (!userId) throw new Error('No signed-in learner');
    await getRepositories().profiles.set(userId, profile);
    if (get().userId === userId) set({ profile });
  },
  selectTarget: async (target) => {
    const { profile, saveProfile } = get();
    if (!profile || profile.source === target) return;
    await saveProfile({ ...profile, target });
  },
  notifyProgressChanged: () => set((s) => ({ progressVersion: s.progressVersion + 1 })),
  reset: () => set({ userId: null, profile: null, profileLoaded: false }),
}));
