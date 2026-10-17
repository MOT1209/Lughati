import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { MIN_TOUCH_TARGET } from '@/constants/app';
import { useTheme } from '@/hooks/useTheme';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  /** Mirror the icon in RTL (arrows, play triangles: anything that points "forward"). */
  iconDirectional?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

type ForegroundKey = 'onPrimary' | 'primary' | 'onErrorMuted' | 'onGold';

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  iconDirectional = false,
  accessibilityLabel,
  style,
}: ButtonProps) {
  const { colors, radius, spacing } = useTheme();
  const inactive = disabled || loading;

  const palettes: Record<ButtonVariant, { bg: string; fg: ForegroundKey; border: string }> = {
    primary: { bg: colors.primary, fg: 'onPrimary', border: colors.primary },
    secondary: { bg: colors.surface, fg: 'primary', border: colors.borderStrong },
    ghost: { bg: 'transparent', fg: 'primary', border: 'transparent' },
    danger: { bg: colors.errorMuted, fg: 'onErrorMuted', border: colors.errorMuted },
    gold: { bg: colors.gold, fg: 'onGold', border: colors.gold },
  };
  const palette = palettes[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          borderRadius: radius.md,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.sm,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      <View style={[styles.content, { gap: spacing.sm }]}>
        {loading ? (
          <ActivityIndicator color={colors[palette.fg]} />
        ) : icon ? (
          <Icon name={icon} size={20} color={palette.fg} directional={iconDirectional} />
        ) : null}
        <Text variant="button" color={palette.fg}>
          {title}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: MIN_TOUCH_TARGET,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
});
