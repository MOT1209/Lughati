import { View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import type { LanguageCode } from '@/types';
import { isolateLtr } from '@/utils/bidi';

/**
 * Text badge for a language ("DE", "EN"). A flag stands for a country, not a language, so the
 * code is used instead; it is decorative because the language name is always rendered beside it.
 */
export function LanguageBadge({ code }: { code: LanguageCode }) {
  const { colors, radius, spacing } = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        backgroundColor: colors.primaryMuted,
        borderRadius: radius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 48,
      }}
    >
      <Text variant="bodyStrong" color="onPrimaryMuted">
        {isolateLtr(code.toUpperCase())}
      </Text>
    </View>
  );
}
