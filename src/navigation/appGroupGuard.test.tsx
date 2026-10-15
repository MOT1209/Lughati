import { act } from '@testing-library/react-native';
import { Slot } from 'expo-router';
import { renderRouter, screen } from 'expo-router/testing-library';
import { Text } from 'react-native';

import '@/i18n'; // AppLayout renders translated titles

import AppLayout from '@/app/(app)/_layout';
import { RootNavigator } from '@/navigation/RootNavigator';
import { registerRepositories } from '@/services/repositories';
import { createMockRepositories } from '@/services/repositories/mock';
import { useAuthStore } from '@/store/authStore';
import { useLearningStore } from '@/store/learningStore';

// Mirror the production tree: the real root stack (session guard) plus the real (app)
// layout (language-profile guard), with stand-in screens, and check where each deep link lands.
const routes = {
  _layout: RootNavigator,
  index: () => <Text>splash-screen</Text>,
  '(auth)/_layout': () => <Slot />,
  '(auth)/login': () => <Text>login-screen</Text>,
  '(app)/_layout': AppLayout,
  '(app)/(tabs)/_layout': () => <Slot />,
  '(app)/(tabs)/home': () => <Text>home-screen</Text>,
  '(app)/setup-languages': () => <Text>setup-screen</Text>,
  '(app)/settings': () => <Text>settings-screen</Text>,
};

const session = {
  user: { id: 'u1', name: 'Sara', email: 's@e.com', sourceLanguage: 'ar', targetLanguage: 'de', joinedAt: '2026-01-01' },
  issuedAt: '2026-01-01',
} as const;

const signInAs = (state: { profile: { source: string; target: string } | null; profileLoaded: boolean }) =>
  act(() => {
    useAuthStore.setState({ session: session as never, initialized: true });
    useLearningStore.setState({
      userId: 'u1',
      profile: state.profile as never,
      profileLoaded: state.profileLoaded,
      progressVersion: 0,
    });
  });

const renderAppAt = (url: string) => renderRouter(routes as never, { initialUrl: url });

describe('(app) deep-link protection', () => {
  beforeEach(() => {
    registerRepositories(createMockRepositories());
  });

  afterEach(() =>
    act(() => {
      useAuthStore.setState({ session: null });
      useLearningStore.setState({ userId: null, profile: null, profileLoaded: false, progressVersion: 0 });
    }),
  );

  it('shows nothing while the signed-in account profile is still loading', () => {
    signInAs({ profile: null, profileLoaded: false });
    renderAppAt('/home');
    expect(screen.queryByText('home-screen')).toBeNull();
    expect(screen.queryByText('setup-screen')).toBeNull();
  });

  it('deep links land on the mandatory setup when the profile loaded but is missing', () => {
    signInAs({ profile: null, profileLoaded: true });
    renderAppAt('/home');
    expect(screen.queryByText('home-screen')).toBeNull();
    expect(screen.getByText('setup-screen')).toBeTruthy();
  });

  it('another learning deep link (settings) also lands on the mandatory setup', () => {
    signInAs({ profile: null, profileLoaded: true });
    renderAppAt('/settings');
    expect(screen.getByText('setup-screen')).toBeTruthy();
  });

  it('opens the learning screen directly once the profile is complete', () => {
    signInAs({ profile: { source: 'ar', target: 'de' }, profileLoaded: true });
    renderAppAt('/home');
    expect(screen.getByText('home-screen')).toBeTruthy();
    expect(screen.queryByText('setup-screen')).toBeNull();
  });

  it('a completed learner can also deep link Settings', () => {
    signInAs({ profile: { source: 'ar', target: 'de' }, profileLoaded: true });
    renderAppAt('/settings');
    expect(screen.getByText('settings-screen')).toBeTruthy();
  });

  it('a profile read that fails resolves as "not chosen yet" (setup, never the learning screens)', () => {
    // loadProfile mirrors a repository failure to profile null + profileLoaded true.
    signInAs({ profile: null, profileLoaded: true });
    renderAppAt('/home');
    expect(screen.queryByText('home-screen')).toBeNull();
    expect(screen.getByText('setup-screen')).toBeTruthy();
  });

  it('a signed-out learner cannot reach any (app) deep link', () => {
    act(() => {
      useAuthStore.setState({ session: null });
      useLearningStore.setState({ profile: { source: 'ar', target: 'de' }, profileLoaded: true });
    });
    renderAppAt('/home');
    expect(screen.queryByText('home-screen')).toBeNull();
  });
});
