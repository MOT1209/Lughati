import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Icon, Text } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';

/** Gold streak pill for the dark hero. Announces the day count as one phrase. */
export function StreakChip({ days }: { days: number }) {
  const { t } = useTranslation();
  const { colors, spacing, radius } = useTheme();
  return (
    <View
      style={[styles.chip, { gap: spacing.xs, borderRadius: radius.pill, paddingHorizontal: spacing.md, borderColor: colors.heroGold, backgroundColor: colors.heroGoldTint }]}
      accessible
      accessibilityLabel={t('home.streakAria', { count: days })}
    >
      <Icon name="flame" size={16} color="heroGold" />
      <Text variant="bodyStrong" color="heroGold">
        {t('home.streakDays', { count: days })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, minHeight: 32 },
});
