import { View, type ViewProps } from 'react-native';

import { useTheme } from '@/hooks/useTheme';

export function Card({ style, children, ...rest }: ViewProps) {
  const { colors, radius, spacing, shadows } = useTheme();
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radius.lg,
          padding: spacing.lg,
        },
        shadows.card,
        style,
      ]}
    >
      {children}
    </View>
  );
}
