import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { STORAGE_KEYS } from '@/constants/app';
import type { LanguagePreference, ThemePreference } from '@/types';

interface PreferencesState {
  themePreference: ThemePreference;
  languagePreference: LanguagePreference;
  /** Splash needs this to choose Onboarding vs Login; kept with the other persisted prefs. */
  onboardingSeen: boolean;
  hasHydrated: boolean;
  setThemePreference: (value: ThemePreference) => void;
  setLanguagePreference: (value: LanguagePreference) => void;
  completeOnboarding: () => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      themePreference: 'system',
      languagePreference: 'system',
      onboardingSeen: false,
      hasHydrated: false,
      setThemePreference: (themePreference) => set({ themePreference }),
      setLanguagePreference: (languagePreference) => set({ languagePreference }),
      completeOnboarding: () => set({ onboardingSeen: true }),
    }),
    {
      name: STORAGE_KEYS.preferences,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ themePreference, languagePreference, onboardingSeen }) => ({
        themePreference,
        languagePreference,
        onboardingSeen,
      }),
      // Runs on success and on failure: a corrupt store must not block startup forever.
      onRehydrateStorage: () => () => {
        usePreferencesStore.setState({ hasHydrated: true });
      },
    },
  ),
);
