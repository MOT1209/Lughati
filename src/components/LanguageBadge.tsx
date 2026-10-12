import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { MIN_TOUCH_TARGET } from '@/constants/app';
import { useTheme } from '@/hooks/useTheme';
import { isolateLtr } from '@/utils/bidi';
import type { LanguageCode } from '@/types';

/**
 * Text badge ("DE", "EN"...) used instead of flags: a flag is a country, not a language.
 * Decorative: the language name is always rendered next to it.
 */
export function LanguageBadge({ code }: { code: LanguageCode }) {
  const { colors, radius } = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.badge, { backgroundColor: colors.primaryMuted, borderRadius: radius.md }]}
    >
      <Text variant="bodyStrong" color="onPrimaryMuted">
        {isolateLtr(code.toUpperCase())}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { minWidth: MIN_TOUCH_TARGET, minHeight: MIN_TOUCH_TARGET, alignItems: 'center', justifyContent: 'center' },
});
