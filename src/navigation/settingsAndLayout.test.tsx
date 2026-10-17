import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { Slot } from 'expo-router';
import { renderRouter, screen } from 'expo-router/testing-library';
import { Alert, Text } from 'react-native';

import RootLayout from '@/app/_layout';
import SettingsScreen from '@/app/(app)/settings';
import { setUiLocale } from '@/i18n'; // also initializes i18n
import * as appLanguage from '@/services/appLanguage';
import { AuthError, MockAuthService, registerAuthService } from '@/services/auth';
import { createMemoryStorage } from '@/services/storage';
import { useAuthStore } from '@/store/authStore';
import { usePreferencesStore } from '@/store/preferencesStore';

const mockHideAsync = jest.fn();
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve(true)),
  hideAsync: (...args: unknown[]) => mockHideAsync(...args),
}));
jest.mock('expo-font', () => ({ ...jest.requireActual('expo-font'), useFonts: () => [true, null] }));

const user = { id: 'user-sara@example.com', name: 'Sara', email: 'sara@example.com', sourceLanguage: 'ar', targetLanguage: 'de', joinedAt: '2026-01-01' } as const;
const session = { user, issuedAt: '2026-01-01T00:00:00.000Z' } as const;

// Integration tests through renderRouter are slow on loaded/slow machines
// (documented in docs/PHASE_1_AUDIT.md §12); give them a generous budget.
const SLOW_TEST_TIMEOUT = 60_000;

describe('Settings screen', () => {
  const routes = { index: () => <Text>splash</Text>, settings: SettingsScreen };

  beforeEach(async () => {
    await setUiLocale('en');
    usePreferencesStore.setState({ languagePreference: 'system', themePreference: 'system' });
    useAuthStore.setState({ session: session as never, initialized: true });
  });
  afterEach(() => {
    jest.restoreAllMocks();
    act(() => useAuthStore.setState({ session: null }));
  });

  const failingAuth = (error: Error) => {
    const service = new MockAuthService(0, createMemoryStorage());
    service.signOut = async () => {
      throw error;
    };
    registerAuthService(service);
  };

  it('tells the user when the saved session could not be removed, and still leaves the screen', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    failingAuth(new AuthError('sign_out_not_persisted'));
    renderRouter(routes, { initialUrl: '/settings' });

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));
    });

    expect(alert).toHaveBeenCalledWith('Sign out', expect.stringContaining('could not be removed'));
    await waitFor(() => expect(screen.getByText('splash')).toBeTruthy());
  }, SLOW_TEST_TIMEOUT);

  it('keeps the screen usable (no stuck spinner, no false alert) when sign-out fails for another reason', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    failingAuth(new Error('boom'));
    renderRouter(routes, { initialUrl: '/settings' });

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));
    });

    expect(alert).not.toHaveBeenCalled();
    expect(screen.queryByText('splash')).toBeNull();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeEnabled();
  }, SLOW_TEST_TIMEOUT);

  it('offers no daily reminder switch while no reminder can actually be scheduled', async () => {
    renderRouter(routes, { initialUrl: '/settings' });
    expect(await screen.findByRole('button', { name: 'Sign out' })).toBeTruthy();
    expect(screen.queryByText('Daily learning reminder')).toBeNull();
    expect(screen.queryByRole('switch')).toBeNull();
  }, SLOW_TEST_TIMEOUT);

  it('reverts the language choice and says so when applying it fails', async () => {
    jest.spyOn(appLanguage, 'applyLanguagePreference').mockRejectedValue(new Error('i18n down'));
    renderRouter(routes, { initialUrl: '/settings' });

    await act(async () => {
      fireEvent.press(screen.getByRole('radio', { name: 'العربية' }));
    });

    expect(await screen.findByText('Could not change the app language. The previous language was kept.')).toBeTruthy();
    expect(usePreferencesStore.getState().languagePreference).toBe('system');
  }, SLOW_TEST_TIMEOUT);
});

describe('Root layout', () => {
  const routes = {
    _layout: RootLayout,
    index: () => <Text>app-ready</Text>,
    '(auth)/_layout': () => <Slot />,
    '(auth)/login': () => <Text>login</Text>,
    '(app)/_layout': () => <Slot />,
    '(app)/home': () => <Text>home</Text>,
  };

  beforeEach(async () => {
    mockHideAsync.mockClear();
    await setUiLocale('en');
    usePreferencesStore.setState({ hasHydrated: true, languagePreference: 'system', onboardingSeen: true });
    useAuthStore.setState({ session: null, initialized: false });
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('starts the app and hides the splash once everything is ready', async () => {
    registerAuthService(new MockAuthService(0, createMemoryStorage()));
    renderRouter(routes, { initialUrl: '/' });
    expect(await screen.findByText('app-ready')).toBeTruthy();
    await waitFor(() => expect(mockHideAsync).toHaveBeenCalled());
  }, SLOW_TEST_TIMEOUT);

  it('still starts when applying the saved language fails (no permanent splash)', async () => {
    jest.spyOn(appLanguage, 'applyLanguagePreference').mockRejectedValue(new Error('i18n down'));
    registerAuthService(new MockAuthService(0, createMemoryStorage()));
    renderRouter(routes, { initialUrl: '/' });
    expect(await screen.findByText('app-ready')).toBeTruthy();
  }, SLOW_TEST_TIMEOUT);

  it('still starts, signed out, when reading the saved session fails', async () => {
    const service = new MockAuthService(0, createMemoryStorage());
    service.getSession = async () => {
      throw new Error('storage down');
    };
    registerAuthService(service);
    renderRouter(routes, { initialUrl: '/' });
    expect(await screen.findByText('app-ready')).toBeTruthy();
    expect(useAuthStore.getState()).toMatchObject({ initialized: true, session: null });
  }, SLOW_TEST_TIMEOUT);

  it('keeps the splash while preferences are still loading', async () => {
    usePreferencesStore.setState({ hasHydrated: false });
    registerAuthService(new MockAuthService(0, createMemoryStorage()));
    renderRouter(routes, { initialUrl: '/' });
    await act(async () => {});
    expect(screen.queryByText('app-ready')).toBeNull();
    expect(mockHideAsync).not.toHaveBeenCalled();
  }, SLOW_TEST_TIMEOUT);
});
