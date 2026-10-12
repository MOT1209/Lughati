import { useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { palettes, type ColorPalette, type ColorSchemeName } from '@/theme/colors';
import { resolveScheme } from '@/theme/resolveScheme';
import { radius, shadows, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';
import { usePreferencesStore } from '@/store/preferencesStore';

export interface Theme {
  scheme: ColorSchemeName;
  isDark: boolean;
  colors: ColorPalette;
  spacing: typeof spacing;
  radius: typeof radius;
  shadows: typeof shadows;
  typography: typeof typography;
}

export function useTheme(): Theme {
  const preference = usePreferencesStore((s) => s.themePreference);
  const system = useColorScheme();
  const scheme = resolveScheme(preference, system);
  return useMemo(
    () => ({
      scheme,
      isDark: scheme === 'dark',
      colors: palettes[scheme],
      spacing,
      radius,
      shadows,
      typography,
    }),
    [scheme],
  );
}
