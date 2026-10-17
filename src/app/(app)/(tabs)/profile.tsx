import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { LanguageBadge } from '@/components/LanguageBadge';
import { Button, ErrorState, LoadingState, Screen, StatTile, Text } from '@/components/ui';
import { useCurrentLearning } from '@/hooks/useCurrentLearning';
import { useTheme } from '@/hooks/useTheme';
import { useUiLocale } from '@/hooks/useUiLocale';
import { isolate, isolateLtr } from '@/utils/bidi';
import { localize } from '@/utils/localize';
import { ROUTES } from '@/utils/routing';

export default function Profile() {
  const { t } = useTranslation();
  const { colors, spacing, radius } = useTheme();
  const { locale } = useUiLocale();
  const insets = useSafeAreaInsets();
  const learning = useCurrentLearning();

  if (learning.status === 'loading') {
    return (
      <Screen edges={['top']}>
        <LoadingState />
      </Screen>
    );
  }
  if (learning.status === 'error') {
    return (
      <Screen edges={['top']}>
        <ErrorState error={learning.error} onRetry={learning.reload} />
      </Screen>
    );
  }

  const { language, level, progress, streak } = learning.data;
  const name = learning.user?.name ?? '';
  const initial = Array.from(name.trim())[0] ?? '';

  return (
    <Screen edges={[]} contentStyle={{ padding: 0, gap: 0 }}>
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
          alignItems: 'center',
          gap: spacing.xs,
        }}
      >
        {/* decorative: the name is announced right below */}
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[styles.avatar, { backgroundColor: colors.heroChip, borderColor: colors.heroGold }]}
        >
          <Text variant="title" color="onHeroChip">
            {initial}
          </Text>
        </View>
        <Text variant="title" color="onHero" accessibilityRole="header">
          {isolate(name)}
        </Text>
        <Text variant="small" color="onHeroMuted">
          {isolateLtr(learning.user?.email ?? '')}
        </Text>

        <View style={[styles.pill, { gap: spacing.sm, borderRadius: radius.md, paddingHorizontal: spacing.md, marginTop: spacing.sm }]}>
          {language ? <LanguageBadge language={language} /> : null}
          <Text variant="bodyStrong" color="onHero">
            {language ? localize(language.name, locale) : ''}
          </Text>
          {level ? (
            <Text variant="caption" color="heroGold">
              {t('profile.levelValue', { level: level.id, title: localize(level.title, locale) })}
            </Text>
          ) : null}
        </View>
      </LinearGradient>

      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        <Text variant="subheading">{t('profile.stats')}</Text>
        <View style={[styles.grid, { gap: spacing.md }]}>
          <StatTile highlight icon="flash-outline" value={String(progress?.totalXp ?? 0)} label={t('profile.statXp')} />
          <StatTile icon="text-outline" value={String(progress?.wordsLearned ?? 0)} label={t('profile.statWords')} />
          <StatTile icon="time-outline" value={String(progress?.minutesLearned ?? 0)} label={t('profile.statMinutes')} />
          <StatTile
            icon="flame-outline"
            value={String(streak.days)}
            label={t('profile.statStreak')}
            accessibilityLabel={t('profile.streakAria', { count: streak.days })}
          />
        </View>

        <Button title={t('profile.openSettings')} icon="settings-outline" variant="secondary" onPress={() => router.push(ROUTES.settings)} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 72, height: 72, borderRadius: 36, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  pill: { flexDirection: 'row', alignItems: 'center', minHeight: 48, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.16)', backgroundColor: 'rgba(255, 255, 255, 0.08)' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
});
