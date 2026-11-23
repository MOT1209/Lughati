import { act } from '@testing-library/react-native';
import { router, type Href } from 'expo-router';
import { renderRouter, screen } from 'expo-router/testing-library';

import { Text } from './Text';
import { Screen } from './Screen';

// Every screen opens on the dark-teal hero or a native header in the hero colour (light icons, set
// in app/_layout.tsx). Only a Screen whose own background reaches the top edge sets themed icons.
const routes = {
  plain: () => (
    <Screen edges={['top']}>
      <Text>Plain</Text>
    </Screen>
  ),
  hero: () => (
    <Screen edges={[]}>
      <Text>Hero</Text>
    </Screen>
  ),
};

// expo-status-bar renders no host element under the RNTL 14 test renderer, so it is replaced by a host
// View that carries the `style` the Screen asked for ('dark' = dark icons for a light background).
jest.mock('expo-status-bar', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createElement } = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  return { StatusBar: ({ style }: { style: string }) => createElement(View, { testID: 'status-bar', barStyle: style }) };
});

const barStyles = () => screen.container.queryAll((node) => node.props.testID === 'status-bar').map((bar) => bar.props.barStyle);

describe('Screen status bar', () => {
  it('uses icons for its own background when that background reaches the top edge', async () => {
    await renderRouter(routes, { initialUrl: '/plain' });
    expect(await screen.findByText('Plain')).toBeTruthy();
    expect(barStyles()).toEqual(['dark']);
  });

  it('leaves the status bar to the hero below it, and lets go once another screen is shown', async () => {
    await renderRouter(routes, { initialUrl: '/hero' });
    expect(await screen.findByText('Hero')).toBeTruthy();
    expect(barStyles()).toEqual([]);

    // 'plain' is a mock route local to this test file, not a real project route.
    await act(() => router.push('/plain' as Href));
    expect(await screen.findByText('Plain')).toBeTruthy();
    expect(barStyles()).toEqual(['dark']);
    // 'hero' is a mock route local to this test file, not a real project route.
    await act(() => router.push('/hero' as Href));
    expect(await screen.findByText('Hero')).toBeTruthy();
    expect(barStyles()).toEqual([]); // the plain screen underneath is no longer focused
  });
});
