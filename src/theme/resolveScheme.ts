import type { ThemePreference } from '@/types';

import type { ColorSchemeName } from './colors';

/** Maps the stored preference plus the OS scheme to the scheme actually rendered. */
export function resolveScheme(
  preference: ThemePreference,
  systemScheme: 'light' | 'dark' | null | undefined,
): ColorSchemeName {
  if (preference === 'light' || preference === 'dark') return preference;
  return systemScheme === 'dark' ? 'dark' : 'light';
}
