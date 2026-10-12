import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '@/constants/app';
import { registerAuthService, MockAuthService } from '@/services/auth';

import { useAuthStore } from './authStore';
import { useLearningStore } from './learningStore';
import { usePreferencesStore } from './preferencesStore';
import { createMemoryStorage } from '@/services/storage';

const credentials = { method: 'password' as const, email: 'sara@example.com', password: 'password1' };

describe('preferences store', () => {
  it('persists theme, language and onboarding but not the hydration flag', async () => {
    usePreferencesStore.getState().setThemePreference('dark');
    usePreferencesStore.getState().setLanguagePreference('en');
    usePreferencesStore.getState().completeOnboarding();

    const raw = await AsyncStorage.getItem(STORAGE_KEYS.preferences);
    const saved = JSON.parse(raw!).state;
    expect(saved).toEqual({ themePreference: 'dark', languagePreference: 'en', onboardingSeen: true });
  });

  it('rehydrates saved preferences and flags hydration done', async () => {
    // setState persists too, so reset first and write the "saved" value afterwards.
    usePreferencesStore.setState({ themePreference: 'system', languagePreference: 'system', onboardingSeen: false, hasHydrated: false });
    await AsyncStorage.setItem(
      STORAGE_KEYS.preferences,
      JSON.stringify({ state: { themePreference: 'light', languagePreference: 'ar', onboardingSeen: true }, version: 0 }),
    );

    await usePreferencesStore.persist.rehydrate();

    const state = usePreferencesStore.getState();
    expect(state).toMatchObject({ themePreference: 'light', languagePreference: 'ar', onboardingSeen: true, hasHydrated: true });
  });

  it('still finishes hydration when nothing is stored', async () => {
    await AsyncStorage.clear();
    usePreferencesStore.setState({ hasHydrated: false });
    await usePreferencesStore.persist.rehydrate();
    expect(usePreferencesStore.getState().hasHydrated).toBe(true);
  });
});

describe('auth store', () => {
  beforeEach(() => {
    registerAuthService(new MockAuthService(0, createMemoryStorage()));
    useAuthStore.setState({ session: null, initialized: false });
  });

  it('is not initialized until the saved session was read', async () => {
    expect(useAuthStore.getState().initialized).toBe(false);
    await useAuthStore.getState().init();
    expect(useAuthStore.getState()).toMatchObject({ initialized: true, session: null });
  });

  it('follows the service: sign in creates a session, sign out clears it and the learning choice', async () => {
    await useAuthStore.getState().init();
    useLearningStore.getState().selectTarget('fr');

    await useAuthStore.getState().signIn(credentials);
    expect(useAuthStore.getState().session?.user.email).toBe('sara@example.com');

    await useAuthStore.getState().signOut();
    expect(useAuthStore.getState().session).toBeNull();
    expect(useLearningStore.getState().selectedTarget).toBeNull();
  });

  it('restores a session that already exists when the app starts', async () => {
    const service = new MockAuthService(0, createMemoryStorage());
    registerAuthService(service);
    await service.signIn(credentials);

    await useAuthStore.getState().init();

    expect(useAuthStore.getState().session?.user.email).toBe('sara@example.com');
  });
});
