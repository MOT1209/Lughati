import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { MIN_TOUCH_TARGET } from '@/constants/app';
import { useTheme } from '@/hooks/useTheme';
import type { ColorPalette } from '@/theme/colors';
import type { ReviewOutcome } from '@/types';

/** Fill and text colour per outcome: warm for "forgot", brand for "remembered". Pairs are contrast-tested. */
const TONES: Record<ReviewOutcome, { bg: keyof ColorPalette; fg: keyof ColorPalette }> = {
  again: { bg: 'errorMuted', fg: 'onErrorMuted' },
  difficult: { bg: 'gold', fg: 'onGold' },
  good: { bg: 'primary', fg: 'onPrimary' },
  easy: { bg: 'heroMid', fg: 'onHero' },
};

interface ReviewOutcomeButtonProps {
  outcome: ReviewOutcome;
  title: string;
  /** When the word comes back if this outcome is chosen ("in 3 days"). */
  interval: string;
  disabled?: boolean;
  onPress: () => void;
}

export function ReviewOutcomeButton({ outcome, title, interval, disabled = false, onPress }: ReviewOutcomeButtonProps) {
  const { colors, spacing, radius } = useTheme();
  const tone = TONES[outcome];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${interval}`}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: colors[tone.bg],
          borderRadius: radius.lg,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={styles.content}>
        <Text variant="button" color={tone.fg}>
          {title}
        </Text>
        <Text variant="caption" color={tone.fg}>
          {interval}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: MIN_TOUCH_TARGET + 8, flexGrow: 1, flexBasis: '45%', justifyContent: 'center' },
  content: { alignItems: 'center' },
});
