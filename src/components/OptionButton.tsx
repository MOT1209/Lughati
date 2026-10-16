import { Pressable, StyleSheet, View, type AccessibilityState } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Icon, Text } from '@/components/ui';
import { MIN_TOUCH_TARGET } from '@/constants/app';
import { useTheme } from '@/hooks/useTheme';

export type OptionState = 'idle' | 'correct' | 'wrong' | 'dimmed';

interface OptionButtonProps {
  text: string;
  accessibilityLabel: string;
  state: OptionState;
  disabled: boolean;
  onPress: () => void;
}

/** Answer choice. Result is shown by icon and border together, never by colour alone. */
export function OptionButton({ text, accessibilityLabel, state, disabled, onPress }: OptionButtonProps) {
  const { colors, radius, spacing } = useTheme();
  const { t } = useTranslation();
  const border = state === 'correct' ? colors.success : state === 'wrong' ? colors.error : colors.borderStrong;

  // Colour and icon carry the verdict visually; screen readers only hear it if it is in the label.
  const label =
    state === 'correct'
      ? t('lesson.optionCorrect', { text: accessibilityLabel })
      : state === 'wrong'
        ? t('lesson.optionWrong', { text: accessibilityLabel })
        : accessibilityLabel;
  const accessibilityState: AccessibilityState = { disabled };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={accessibilityState}
      style={[
        styles.base,
        {
          minHeight: MIN_TOUCH_TARGET + 8,
          gap: spacing.md,
          padding: spacing.md,
          borderRadius: radius.lg,
          borderWidth: state === 'correct' || state === 'wrong' ? 2 : 1,
          borderColor: border,
          backgroundColor: colors.surface,
          opacity: state === 'dimmed' ? 0.6 : 1,
        },
      ]}
    >
      <View style={styles.flex}>
        <Text variant="bodyStrong">{text}</Text>
      </View>
      {state === 'correct' ? <Icon name="checkmark-circle" color="success" /> : null}
      {state === 'wrong' ? <Icon name="close-circle" color="error" /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
});
