import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { I18nManager } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import type { ColorPalette } from '@/theme/colors';

export type IconName = ComponentProps<typeof Ionicons>['name'];

interface IconProps {
  name: IconName;
  size?: number;
  color?: keyof ColorPalette;
  /** Arrows/chevrons that point "forward" must mirror in RTL layouts. */
  directional?: boolean;
}

export function Icon({ name, size = 24, color = 'text', directional = false }: IconProps) {
  const theme = useTheme();
  return (
    <Ionicons
      name={name}
      size={size}
      color={theme.colors[color]}
      style={directional && I18nManager.isRTL ? { transform: [{ scaleX: -1 }] } : undefined}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}
