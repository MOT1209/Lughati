import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { renderRouter, screen } from 'expo-router/testing-library';

import LoginScreen from '@/app/(auth)/login';
import OnboardingScreen from '@/app/(auth)/onboarding';
import RegisterScreen from '@/app/(auth)/register';
import { setUiLocale } from '@/i18n';
import { MockAuthService, registerAuthService } from '@/services/auth';
import { createMemoryStorage } from '@/services/storage';
import { useAuthStore } from '@/store/authStore';
import { usePreferencesStore } from '@/store/preferencesStore';

// Integration tests through renderRouter are slow on loaded/slow machines
// (documented in docs/PHASE_1_AUDIT.md §12); give them a generous budget.
const SLOW_TEST_TIMEOUT = 60_000;

const routes = {
  index: () => null, // Splash stand-in: forms navigate here after success
  login: LoginScreen,
  register: RegisterScreen,
  onboarding: OnboardingScreen,
};

beforeEach(async () => {
  registerAuthService(new MockAuthService(0, createMemoryStorage()));
  await act(async () => {
    useAuthStore.setState({ session: null, initialized: false });
    usePreferencesStore.setState({ onboardingSeen: false });
    await useAuthStore.getState().init(); // subscribes the store to the service's auth changes
  });
  await setUiLocale('en');
});

describe('Login screen', () => {
  it('validates empty and malformed input without calling sign-in', async () => {
    renderRouter(routes, { initialUrl: '/login' });
    fireEvent.press(await screen.findByRole('button', { name: 'Sign in' }));
    expect(await screen.findAllByText('This field is required')).toHaveLength(2);

    fireEvent.changeText(screen.getByLabelText('Email'), 'not-an-email');
    fireEvent.changeText(screen.getByLabelText('Password'), 'x');
    fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Enter a valid email address')).toBeTruthy();
    expect(useAuthStore.getState().session).toBeNull();
  }, SLOW_TEST_TIMEOUT);

  it('shows the credentials error for a failing account', async () => {
    renderRouter(routes, { initialUrl: '/login' });
    fireEvent.changeText(await screen.findByLabelText('Email'), 'fail@example.com');
    fireEvent.changeText(screen.getByLabelText('Password'), 'password123');
    fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Incorrect email or password.')).toBeTruthy();
  }, SLOW_TEST_TIMEOUT);

  it('shows the network error for an offline account', async () => {
    renderRouter(routes, { initialUrl: '/login' });
    fireEvent.changeText(await screen.findByLabelText('Email'), 'offline@example.com');
    fireEvent.changeText(screen.getByLabelText('Password'), 'password123');
    fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Could not connect. Check your internet and try again.')).toBeTruthy();
  }, SLOW_TEST_TIMEOUT);

  it('signs in with a valid email and password', async () => {
    renderRouter(routes, { initialUrl: '/login' });
    fireEvent.changeText(await screen.findByLabelText('Email'), 'sara@example.com');
    fireEvent.changeText(screen.getByLabelText('Password'), 'password123');
    fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(useAuthStore.getState().session?.user.email).toBe('sara@example.com'));
  }, SLOW_TEST_TIMEOUT);
});

describe('Register screen', () => {
  it('rejects mismatched passwords and a registered email', async () => {
    renderRouter(routes, { initialUrl: '/register' });
    fireEvent.changeText(await screen.findByLabelText('Name'), 'Sara');
    fireEvent.changeText(screen.getByLabelText('Email'), 'sara@example.com');
    fireEvent.changeText(screen.getByLabelText('Password'), 'password123');
    fireEvent.changeText(screen.getByLabelText('Confirm password'), 'different123');
    fireEvent.press(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('Passwords do not match')).toBeTruthy();
    expect(useAuthStore.getState().session).toBeNull();

    fireEvent.changeText(screen.getByLabelText('Email'), 'taken@example.com');
    fireEvent.changeText(screen.getByLabelText('Confirm password'), 'password123');
    fireEvent.press(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('This email is already registered.')).toBeTruthy();
  }, SLOW_TEST_TIMEOUT);

  it('creates an account and signs in', async () => {
    renderRouter(routes, { initialUrl: '/register' });
    fireEvent.changeText(await screen.findByLabelText('Name'), 'Sara');
    fireEvent.changeText(screen.getByLabelText('Email'), 'new@example.com');
    fireEvent.changeText(screen.getByLabelText('Password'), 'password123');
    fireEvent.changeText(screen.getByLabelText('Confirm password'), 'password123');
    fireEvent.press(screen.getByRole('button', { name: 'Create account' }));
    await waitFor(() => expect(useAuthStore.getState().session?.user.name).toBe('Sara'));
  }, SLOW_TEST_TIMEOUT);
});

describe('Onboarding screen', () => {
  it('steps through the three slides and marks onboarding as seen on the last one', async () => {
    renderRouter(routes, { initialUrl: '/onboarding' });
    expect(await screen.findByText('Learn multiple languages')).toBeTruthy();
    expect(screen.getByLabelText('Slide 1 of 3')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByText('A plan that fits you')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByText('Keep going every day')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Skip' })).toBeNull();

    expect(usePreferencesStore.getState().onboardingSeen).toBe(false);
    fireEvent.press(screen.getByRole('button', { name: 'Get started' }));
    expect(usePreferencesStore.getState().onboardingSeen).toBe(true);
  }, SLOW_TEST_TIMEOUT);

  it('skip marks onboarding as seen from the first slide', async () => {
    renderRouter(routes, { initialUrl: '/onboarding' });
    fireEvent.press(await screen.findByRole('button', { name: 'Skip' }));
    expect(usePreferencesStore.getState().onboardingSeen).toBe(true);
  }, SLOW_TEST_TIMEOUT);
});
