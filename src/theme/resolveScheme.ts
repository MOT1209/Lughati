import type { ThemePreference } from '@/types';

import type { ColorSchemeName } from './colors';

/** Maps the stored preference plus the OS scheme to the scheme actually rendered. */
export function resolveScheme(
  preference: ThemePreference,
  // React Native's useColorScheme() can also report 'unspecified'; it is treated as light.
  systemScheme: 'light' | 'dark' | 'unspecified' | null | undefined,
): ColorSchemeName {
  if (preference === 'light' || preference === 'dark') return preference;
  return systemScheme === 'dark' ? 'dark' : 'light';
}
