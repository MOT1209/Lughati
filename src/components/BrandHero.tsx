import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { fontFamilies } from '@/theme/typography';

interface BrandHeroProps {
  title: string;
  subtitle: string;
  children?: ReactNode;
}

/** Sign-in/up header: the app name as a wordmark with the gold swoosh of the icon, then the screen title. */
export function BrandHero({ title, subtitle, children }: BrandHeroProps) {
  const { t } = useTranslation();
  const { colors, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={[colors.heroStart, colors.heroMid, colors.heroEnd]}
      locations={[0, 0.5, 1]}
      start={{ x: 1, y: 0 }}
      end={{ x: 0.2, y: 1 }}
      style={{
        paddingTop: insets.top + spacing.xl,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xl,
        borderBottomLeftRadius: radius.xl,
        borderBottomRightRadius: radius.xl,
        gap: spacing.md,
      }}
    >
      <View accessible accessibilityLabel={t('app.name')} style={styles.mark}>
        <Text variant="display" color="onHero" style={styles.wordmark}>
          {t('app.name')}
        </Text>
        <View style={[styles.swoosh, { backgroundColor: colors.heroGold, borderRadius: radius.pill }]} />
      </View>
      <View>
        <Text variant="title" color="onHero" accessibilityRole="header">
          {title}
        </Text>
        <Text variant="small" color="onHeroMuted">
          {subtitle}
        </Text>
      </View>
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  mark: { alignItems: 'flex-start', gap: 4 },
  wordmark: { fontFamily: fontFamilies.bold, fontSize: 44, lineHeight: 64 },
  swoosh: { width: 72, height: 6 },
});
