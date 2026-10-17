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

afterEach(() => {
  act(() => useAuthStore.setState({ session: null }));
});

const type = (label: string, text: string) => fireEvent.changeText(screen.getByLabelText(label), text);

describe('Login screen', () => {
  it('shows field errors and does not submit an invalid form', async () => {
    renderRouter(routes, { initialUrl: '/login' });
    await act(async () => {
      fireEvent.press(await screen.findByRole('button', { name: 'Sign in' }));
    });
    expect(screen.getAllByText('This field is required')).toHaveLength(2);

    type('Email', 'not-an-email');
    type('Password', 'password1');
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    });
    expect(screen.getByText('Enter a valid email address')).toBeTruthy();
    expect(screen.queryByText('This field is required')).toBeNull(); // the password error cleared
    expect(useAuthStore.getState().session).toBeNull();
  }, SLOW_TEST_TIMEOUT);

  it('shows the service error for wrong credentials and stays on the screen', async () => {
    renderRouter(routes, { initialUrl: '/login' });
    type('Email', 'fail@example.com');
    type('Password', 'password1');
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    });
    expect(await screen.findByText('Incorrect email or password.')).toBeTruthy();
    expect(screen.queryByText('splash')).toBeNull();
    expect(useAuthStore.getState().session).toBeNull();
  }, SLOW_TEST_TIMEOUT);

  it('signs in and hands over to the splash, which picks the next screen', async () => {
    renderRouter(routes, { initialUrl: '/login' });
    type('Email', '  Sara@Example.com ');
    type('Password', 'password1');
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    });
    expect(await screen.findByText('splash')).toBeTruthy();
    expect(useAuthStore.getState().session?.user.email).toBe('sara@example.com');
  }, SLOW_TEST_TIMEOUT);
});

describe('Register screen', () => {
  const fill = (email: string, password: string, confirm: string) => {
    type('Name', 'Sara');
    type('Email', email);
    type('Password', password);
    type('Confirm password', confirm);
  };

  it('rejects a confirmation that does not match', async () => {
    renderRouter(routes, { initialUrl: '/register' });
    await screen.findByLabelText('Name');
    fill('sara@example.com', 'password1', 'password2');
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Create account' }));
    });
    expect(screen.getByText('Passwords do not match')).toBeTruthy();
    expect(useAuthStore.getState().session).toBeNull();
  }, SLOW_TEST_TIMEOUT);

  it('says when the email is already registered', async () => {
    renderRouter(routes, { initialUrl: '/register' });
    await screen.findByLabelText('Name');
    fill('taken@example.com', 'password1', 'password1');
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Create account' }));
    });
    expect(await screen.findByText('This email is already registered.')).toBeTruthy();
  }, SLOW_TEST_TIMEOUT);

  it('creates the account with the chosen name and hands over to the splash', async () => {
    renderRouter(routes, { initialUrl: '/register' });
    await screen.findByLabelText('Name');
    fill('new@example.com', 'password1', 'password1');
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Create account' }));
    });
    expect(await screen.findByText('splash')).toBeTruthy();
    expect(useAuthStore.getState().session?.user).toMatchObject({ name: 'Sara', email: 'new@example.com' });
  }, SLOW_TEST_TIMEOUT);
});

describe('Onboarding screen', () => {
  it('walks through the three slides and remembers that onboarding was seen', async () => {
    renderRouter(routes, { initialUrl: '/onboarding' });
    expect(await screen.findByText('Learn multiple languages')).toBeTruthy();
    expect(screen.getByLabelText('Slide 1 of 3')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('A plan that fits you')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Keep going every day')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Skip' })).toBeNull(); // no skip on the last slide

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Get started' }));
    });
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeTruthy();
    expect(usePreferencesStore.getState().onboardingSeen).toBe(true);
  }, SLOW_TEST_TIMEOUT);

  it('skip goes straight to sign-in', async () => {
    renderRouter(routes, { initialUrl: '/onboarding' });
    await act(async () => {
      fireEvent.press(await screen.findByRole('button', { name: 'Skip' }));
    });
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeTruthy();
    expect(usePreferencesStore.getState().onboardingSeen).toBe(true);
  }, SLOW_TEST_TIMEOUT);
});
