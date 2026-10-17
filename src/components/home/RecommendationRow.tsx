import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Icon, Text, type IconName } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';

interface RecommendationRowProps {
  text: string;
  icon: IconName;
  onPress: () => void;
}

/** "Recommended for you": one tappable line that leads to review or to the lesson. */
export function RecommendationRow({ text, icon, onPress }: RecommendationRowProps) {
  const { t } = useTranslation();
  const { colors, spacing, radius } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${t('home.recommended')}: ${text}`}
      style={({ pressed }) => [
        styles.row,
        {
          gap: spacing.md,
          padding: spacing.md,
          borderRadius: radius.lg,
          backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={[styles.tile, { backgroundColor: colors.primaryMuted, borderRadius: radius.md }]}>
        <Icon name={icon} size={22} color="onPrimaryMuted" />
      </View>
      <View style={styles.flex}>
        <Text variant="caption" color="textSecondary">
          {t('home.recommended')}
        </Text>
        <Text variant="bodyStrong">{text}</Text>
      </View>
      <Icon name="chevron-forward" size={20} color="textSecondary" directional />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
  tile: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
});
