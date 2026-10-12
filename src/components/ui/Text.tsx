import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import type { ColorPalette } from '@/theme/colors';
import type { TypographyVariant } from '@/theme/typography';

export interface TextProps extends RNTextProps {
  variant?: TypographyVariant;
  color?: keyof ColorPalette;
}

export function Text({ variant = 'body', color = 'text', style, ...rest }: TextProps) {
  const theme = useTheme();
  return <RNText {...rest} style={[theme.typography[variant], { color: theme.colors[color] }, style]} />;
}
