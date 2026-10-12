import { DevSettings, I18nManager, Platform } from 'react-native';

export type DirectionAction = 'none' | 'restart-required';

/** Pure decision: a restart is needed only when native layout direction differs from desired. */
export function getDirectionAction(currentIsRtl: boolean, desiredIsRtl: boolean): DirectionAction {
  return currentIsRtl === desiredIsRtl ? 'none' : 'restart-required';
}

/**
 * Asks React Native to use the desired layout direction. RN reads the flag at startup, so a
 * differing direction only takes effect after a reload (see TESTING.md for the Expo Go caveat).
 */
export function applyLayoutDirection(desiredIsRtl: boolean): DirectionAction {
  if (Platform.OS === 'web') return 'none';
  const action = getDirectionAction(I18nManager.isRTL, desiredIsRtl);
  if (action === 'restart-required') {
    I18nManager.allowRTL(desiredIsRtl);
    I18nManager.forceRTL(desiredIsRtl);
  }
  return action;
}

export function reloadApp(): void {
  DevSettings.reload();
}
