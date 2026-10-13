import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '@/constants/app';
import { registerAuthService, MockAuthService } from '@/services/auth';

import { useAuthStore } from './authStore';
import { useLearningStore } from './learningStore';
import { usePreferencesStore } from './preferencesStore';
import { registerRepositories } from '@/services/repositories';
import { createMockRepositories } from '@/services/repositories/mock';
import { createMemoryStorage } from '@/services/storage';

/** The profile is loaded in the background after a sign-in; wait until it is known. */
const waitForProfile = async () => {
  for (let i = 0; i < 50 && !useLearningStore.getState().profileLoaded; i++) await new Promise((r) => setTimeout(r, 0));
  expect(useLearningStore.getState().profileLoaded).toBe(true);
};

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

describe('preferences store: invalid saved values', () => {
  it('falls back to defaults for unknown theme/language values (would otherwise yield LTR layout with an unknown locale)', async () => {
    usePreferencesStore.setState({ themePreference: 'system', languagePreference: 'system', onboardingSeen: false, hasHydrated: false });
    await AsyncStorage.setItem(
      STORAGE_KEYS.preferences,
      JSON.stringify({ state: { themePreference: 'neon', languagePreference: 'xx', onboardingSeen: 'yes' }, version: 0 }),
    );
    await usePreferencesStore.persist.rehydrate();
    expect(usePreferencesStore.getState()).toMatchObject({ themePreference: 'system', languagePreference: 'system', onboardingSeen: false, hasHydrated: true });
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

  it('finishes initialization even if reading the session fails, so the app is not stuck on the splash', async () => {
    const failing = new MockAuthService(0, createMemoryStorage());
    failing.getSession = async () => {
      throw new Error('boom');
    };
    registerAuthService(failing);
    await useAuthStore.getState().init();
    expect(useAuthStore.getState()).toMatchObject({ initialized: true, session: null });
  });

  it('follows the service: sign in creates a session, sign out clears it and the learning choice', async () => {
    await useAuthStore.getState().init();

    await useAuthStore.getState().signIn(credentials);
    expect(useAuthStore.getState().session?.user.email).toBe('sara@example.com');
    await waitForProfile();
    await useLearningStore.getState().saveProfile({ source: 'ar', target: 'fr' });

    await useAuthStore.getState().signOut();
    expect(useAuthStore.getState().session).toBeNull();
    expect(useLearningStore.getState()).toMatchObject({ profile: null, profileLoaded: false, userId: null });
  });

  it("asks a new account for its languages, then remembers the choice for that account", async () => {
    registerRepositories(createMockRepositories());
    await useAuthStore.getState().init();
    await useAuthStore.getState().signIn(credentials);
    await waitForProfile();
    expect(useLearningStore.getState().profile).toBeNull(); // not chosen yet: the splash sends to setup

    await useLearningStore.getState().saveProfile({ source: 'de', target: 'es' });
    await useLearningStore.getState().selectTarget('fr');
    await useAuthStore.getState().signOut();

    await useAuthStore.getState().signIn(credentials);
    await waitForProfile();
    expect(useLearningStore.getState().profile).toEqual({ source: 'de', target: 'fr' });
  });

  it('never makes the own language the learned one', async () => {
    registerRepositories(createMockRepositories());
    await useAuthStore.getState().init();
    await useAuthStore.getState().signIn(credentials);
    await waitForProfile();
    await useLearningStore.getState().saveProfile({ source: 'de', target: 'es' });
    await useLearningStore.getState().selectTarget('de');
    expect(useLearningStore.getState().profile).toEqual({ source: 'de', target: 'es' });
  });

  it('restores a session that already exists when the app starts', async () => {
    const service = new MockAuthService(0, createMemoryStorage());
    registerAuthService(service);
    await service.signIn(credentials);

    await useAuthStore.getState().init();

    expect(useAuthStore.getState().session?.user.email).toBe('sara@example.com');
  });
});
