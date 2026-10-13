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

const isTheme = (v: unknown): v is ThemePreference => v === 'system' || v === 'light' || v === 'dark';
const isLanguage = (v: unknown): v is LanguagePreference => v === 'system' || v === 'ar' || v === 'en';

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
      // Stored values come from disk: an unknown one (older build, manual edit) falls back to the
      // default instead of reaching i18n/layout direction as an unsupported locale.
      merge: (persisted, current) => {
        const saved = (typeof persisted === 'object' && persisted !== null ? persisted : {}) as Record<string, unknown>;
        return {
          ...current,
          themePreference: isTheme(saved.themePreference) ? saved.themePreference : current.themePreference,
          languagePreference: isLanguage(saved.languagePreference) ? saved.languagePreference : current.languagePreference,
          onboardingSeen: typeof saved.onboardingSeen === 'boolean' ? saved.onboardingSeen : current.onboardingSeen,
        };
      },
      // Runs on success and on failure: a corrupt store must not block startup forever.
      onRehydrateStorage: () => () => {
        usePreferencesStore.setState({ hasHydrated: true });
      },
    },
  ),
);
