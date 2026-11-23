import { act, fireEvent } from '@testing-library/react-native';
import { renderRouter, screen } from 'expo-router/testing-library';
import { Text } from 'react-native';

import Login from '@/app/(auth)/login';
import Onboarding from '@/app/(auth)/onboarding';
import Register from '@/app/(auth)/register';
import { setUiLocale } from '@/i18n';
import { MockAuthService, registerAuthService } from '@/services/auth';
import { createMemoryStorage } from '@/services/storage';
import { useAuthStore } from '@/store/authStore';
import { usePreferencesStore } from '@/store/preferencesStore';

// Integration tests through renderRouter are slow on loaded machines; give them a generous budget.
const SLOW_TEST_TIMEOUT = 60_000;

const routes = {
  index: () => <Text>splash</Text>,
  login: Login,
  register: Register,
  onboarding: Onboarding,
};

beforeEach(async () => {
  await setUiLocale('en');
  // A fresh mock per test (no delay, in-memory session) wired into the store the screens use.
  registerAuthService(new MockAuthService(0, createMemoryStorage()));
  await act(async () => {
    await useAuthStore.getState().init();
  });
  usePreferencesStore.setState({ onboardingSeen: false });
});

afterEach(async () => {
  await act(() => useAuthStore.setState({ session: null }));
});

const type = async (label: string, text: string) => await fireEvent.changeText(screen.getByLabelText(label), text);

describe('Brand header', () => {
  it('shows the app name as a wordmark above the sign-in and sign-up titles', async () => {
    await renderRouter(routes, { initialUrl: '/login' });
    expect(await screen.findByLabelText('Lughati')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Sign in' })).toBeTruthy();
  }, SLOW_TEST_TIMEOUT);
});

describe('Login screen', () => {
  it('shows field errors and does not submit an invalid form', async () => {
    await renderRouter(routes, { initialUrl: '/login' });
    await act(async () => {
      await fireEvent.press(await screen.findByRole('button', { name: 'Sign in' }));
    });
    expect(screen.getAllByText('This field is required')).toHaveLength(2);

    await type('Email', 'not-an-email');
    await type('Password', 'password1');
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    });
    expect(screen.getByText('Enter a valid email address')).toBeTruthy();
    expect(screen.queryByText('This field is required')).toBeNull(); // the password error cleared
    expect(useAuthStore.getState().session).toBeNull();
  }, SLOW_TEST_TIMEOUT);

  it('shows the service error for wrong credentials and stays on the screen', async () => {
    await renderRouter(routes, { initialUrl: '/login' });
    await type('Email', 'fail@example.com');
    await type('Password', 'password1');
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    });
    expect(await screen.findByText('Incorrect email or password.')).toBeTruthy();
    expect(screen.queryByText('splash')).toBeNull();
    expect(useAuthStore.getState().session).toBeNull();
  }, SLOW_TEST_TIMEOUT);

  it('signs in and hands over to the splash, which picks the next screen', async () => {
    await renderRouter(routes, { initialUrl: '/login' });
    await type('Email', '  Sara@Example.com ');
    await type('Password', 'password1');
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    });
    expect(await screen.findByText('splash')).toBeTruthy();
    expect(useAuthStore.getState().session?.user.email).toBe('sara@example.com');
  }, SLOW_TEST_TIMEOUT);
});

describe('Register screen', () => {
  const fill = async (email: string, password: string, confirm: string) => {
    await type('Name', 'Sara');
    await type('Email', email);
    await type('Password', password);
    await type('Confirm password', confirm);
  };

  it('rejects a confirmation that does not match', async () => {
    await renderRouter(routes, { initialUrl: '/register' });
    await screen.findByLabelText('Name');
    await fill('sara@example.com', 'password1', 'password2');
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: 'Create account' }));
    });
    expect(screen.getByText('Passwords do not match')).toBeTruthy();
    expect(useAuthStore.getState().session).toBeNull();
  }, SLOW_TEST_TIMEOUT);

  it('says when the email is already registered', async () => {
    await renderRouter(routes, { initialUrl: '/register' });
    await screen.findByLabelText('Name');
    await fill('taken@example.com', 'password1', 'password1');
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: 'Create account' }));
    });
    expect(await screen.findByText('This email is already registered.')).toBeTruthy();
  }, SLOW_TEST_TIMEOUT);

  it('creates the account with the chosen name and hands over to the splash', async () => {
    await renderRouter(routes, { initialUrl: '/register' });
    await screen.findByLabelText('Name');
    await fill('new@example.com', 'password1', 'password1');
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: 'Create account' }));
    });
    expect(await screen.findByText('splash')).toBeTruthy();
    expect(useAuthStore.getState().session?.user).toMatchObject({ name: 'Sara', email: 'new@example.com' });
  }, SLOW_TEST_TIMEOUT);
});

describe('Onboarding screen', () => {
  it('walks through the three slides and remembers that onboarding was seen', async () => {
    await renderRouter(routes, { initialUrl: '/onboarding' });
    expect(await screen.findByText('Learn multiple languages')).toBeTruthy();
    expect(screen.getByLabelText('Slide 1 of 3')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('A plan that fits you')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Keep going every day')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Skip' })).toBeNull(); // no skip on the last slide

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: 'Get started' }));
    });
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeTruthy();
    expect(usePreferencesStore.getState().onboardingSeen).toBe(true);
  }, SLOW_TEST_TIMEOUT);

  it('skip goes straight to sign-in', async () => {
    await renderRouter(routes, { initialUrl: '/onboarding' });
    await act(async () => {
      await fireEvent.press(await screen.findByRole('button', { name: 'Skip' }));
    });
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeTruthy();
    expect(usePreferencesStore.getState().onboardingSeen).toBe(true);
  }, SLOW_TEST_TIMEOUT);
});
