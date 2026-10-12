import { act } from '@testing-library/react-native';
import { Slot } from 'expo-router';
import { renderRouter, screen } from 'expo-router/testing-library';
import { Text } from 'react-native';

import '@/i18n';

import { useAuthStore } from '@/store/authStore';

import { RootNavigator } from './RootNavigator';

const session = {
  user: { id: 'u1', name: 'Sara', email: 's@e.com', sourceLanguage: 'ar', targetLanguage: 'de', joinedAt: '2026-01-01' },
  issuedAt: '2026-01-01',
} as const;

// Minimal route tree: the real RootNavigator guarding stand-in screens.
const routes = {
  _layout: RootNavigator,
  index: () => <Text>splash</Text>,
  '(auth)/_layout': () => <Slot />,
  '(auth)/login': () => <Text>login-screen</Text>,
  '(app)/_layout': () => <Slot />,
  '(app)/home': () => <Text>home-screen</Text>,
};

describe('RootNavigator route protection', () => {
  afterEach(() => {
    act(() => useAuthStore.setState({ session: null }));
  });

  it('without a session the app group is unreachable and the auth group is reachable', () => {
    useAuthStore.setState({ session: null });
    renderRouter(routes, { initialUrl: '/login' });
    expect(screen.getByText('login-screen')).toBeTruthy();
  });

  it('without a session a deep link to the app group does not show the app screen', () => {
    useAuthStore.setState({ session: null });
    renderRouter(routes, { initialUrl: '/home' });
    expect(screen.queryByText('home-screen')).toBeNull();
  });

  it('with a session the app group is reachable', () => {
    useAuthStore.setState({ session: session as never });
    renderRouter(routes, { initialUrl: '/home' });
    expect(screen.getByText('home-screen')).toBeTruthy();
  });

  it('with a session a deep link to the auth group does not show the login screen', () => {
    useAuthStore.setState({ session: session as never });
    renderRouter(routes, { initialUrl: '/login' });
    expect(screen.queryByText('login-screen')).toBeNull();
  });

  it('signing out removes access to the app group', () => {
    useAuthStore.setState({ session: session as never });
    renderRouter(routes, { initialUrl: '/home' });
    expect(screen.getByText('home-screen')).toBeTruthy();
    act(() => useAuthStore.setState({ session: null }));
    expect(screen.queryByText('home-screen')).toBeNull();
  });
});
