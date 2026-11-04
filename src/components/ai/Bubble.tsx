import { View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { isolate } from '@/utils/bidi';

/** One chat turn. Mixed-script text is bidi-isolated so Arabic and Latin do not reorder each other. */
export function Bubble({ who, role, children, extra }: { who: string; role: 'user' | 'assistant'; children: string; extra?: React.ReactNode }) {
  const { colors, radius, spacing } = useTheme();
  const mine = role === 'user';
  return (
    <View
      accessible
      accessibilityLabel={`${who}: ${children}`}
      style={{
        alignSelf: mine ? 'flex-end' : 'flex-start',
        maxWidth: '92%',
        backgroundColor: mine ? colors.surfaceMuted : colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radius.lg,
        padding: spacing.md,
        gap: spacing.xs,
      }}
    >
      <Text variant="caption" color="textSecondary">
        {who}
      </Text>
      <Text>{isolate(children)}</Text>
      {extra}
    </View>
  );
}
