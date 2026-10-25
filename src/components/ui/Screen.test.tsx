import { act } from '@testing-library/react-native';
import { router } from 'expo-router';
import { renderRouter, screen } from 'expo-router/testing-library';
import { StatusBar } from 'react-native';

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

const barStyles = () => screen.UNSAFE_queryAllByType(StatusBar).map((bar) => bar.props.barStyle);

describe('Screen status bar', () => {
  it('uses icons for its own background when that background reaches the top edge', async () => {
    renderRouter(routes, { initialUrl: '/plain' });
    expect(await screen.findByText('Plain')).toBeTruthy();
    expect(barStyles()).toEqual(['dark-content']);
  });

  it('leaves the status bar to the hero below it, and lets go once another screen is shown', async () => {
    renderRouter(routes, { initialUrl: '/hero' });
    expect(await screen.findByText('Hero')).toBeTruthy();
    expect(barStyles()).toEqual([]);

    act(() => router.push('/plain'));
    expect(await screen.findByText('Plain')).toBeTruthy();
    expect(barStyles()).toEqual(['dark-content']);
    act(() => router.push('/hero'));
    expect(await screen.findByText('Hero')).toBeTruthy();
    expect(barStyles()).toEqual([]); // the plain screen underneath is no longer focused
  });
});
