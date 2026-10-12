import { Slot } from 'expo-router';
import { renderRouter, screen } from 'expo-router/testing-library';
import { Text } from 'react-native';

import '@/i18n';

import { RootStack } from './RootStack';

const page = (label: string) => {
  const Page = () => <Text>{label}</Text>;
  Page.displayName = `Page(${label})`;
  return Page;
};

function routes(hasSession: boolean) {
  return {
    _layout: function Layout() {
      return <RootStack hasSession={hasSession} />;
    },
    index: page('splash'),
    // Group layouts are required so (auth) and (app) exist as real groups the guard can protect.
    '(auth)/_layout': Slot,
    '(app)/_layout': Slot,
    '(auth)/login': page('login-screen'),
    '(auth)/register': page('register-screen'),
    '(app)/home': page('home-screen'),
    '(app)/settings': page('settings-screen'),
  };
}

describe('route protection by session', () => {
  it('signed out: the login route opens', () => {
    renderRouter(routes(false), { initialUrl: '/login' });
    expect(screen.getByText('login-screen')).toBeTruthy();
  });

  it('signed out: a protected app route does not render', () => {
    const view = renderRouter(routes(false), { initialUrl: '/settings' });
    expect(view.getPathname()).not.toBe('/settings');
  });

  it('signed in: the app route opens', () => {
    renderRouter(routes(true), { initialUrl: '/settings' });
    expect(screen.getByText('settings-screen')).toBeTruthy();
  });

  it('signed in: the auth routes do not render', () => {
    const view = renderRouter(routes(true), { initialUrl: '/login' });
    expect(view.getPathname()).not.toBe('/login');
  });
});
