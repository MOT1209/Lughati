import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ProgressBar } from '@/components/ProgressBar';
import { LanguageBadge } from '@/components/LanguageBadge';
import { StatTile } from '@/components/ui/StatTile';
import { Button, Card, ErrorState, Icon, LoadingState, Screen, Text } from '@/components/ui';
import { useCurrentLearning } from '@/hooks/useCurrentLearning';
import { useTheme } from '@/hooks/useTheme';
import { useUiLocale } from '@/hooks/useUiLocale';
import { isolate, isolateLtr } from '@/utils/bidi';
import { localize } from '@/utils/localize';
import { ROUTES } from '@/utils/routing';

export default function Profile() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const { locale } = useUiLocale();
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
        <ErrorState onRetry={learning.reload} />
      </Screen>
    );
  }

  const { language, level, progress, streak } = learning.data;

  return (
    <Screen edges={['top']}>
      <View style={[styles.row, { gap: spacing.md }]}>
        <Icon name="person-circle-outline" size={64} color="primary" />
        <View style={styles.flex}>
          <Text variant="title" accessibilityRole="header">
            {isolate(learning.user?.name ?? '')}
          </Text>
          <Text variant="small" color="textSecondary">
            {isolateLtr(learning.user?.email ?? '')}
          </Text>
        </View>
      </View>

      <Card style={{ gap: spacing.md }}>
        <View style={styles.between}>
          <Text color="textSecondary">{t('profile.language')}</Text>
          <View style={[styles.row, { gap: spacing.sm }]}>
            {language ? <LanguageBadge language={language} /> : null}
            <Text variant="bodyStrong">{language ? localize(language.name, locale) : ''}</Text>
          </View>
        </View>
        <View style={styles.between}>
          <Text color="textSecondary">{t('profile.level')}</Text>
          <Text variant="bodyStrong">{level ? `${level.id} · ${localize(level.title, locale)}` : ''}</Text>
        </View>
        <View style={{ gap: spacing.xs }}>
          <Text color="textSecondary">{t('profile.progress')}</Text>
          <ProgressBar value={progress?.levelProgress ?? 0} accessibilityLabel={t('profile.progress')} />
        </View>
      </Card>

      <Text variant="subheading">{t('profile.stats')}</Text>
      <View style={[styles.grid, { gap: spacing.md }]}>
        <StatTile icon="flash-outline" value={String(progress?.totalXp ?? 0)} label={t('profile.statXp')} />
        <StatTile icon="text-outline" value={String(progress?.wordsLearned ?? 0)} label={t('profile.statWords')} />
        <StatTile icon="time-outline" value={String(progress?.minutesLearned ?? 0)} label={t('profile.statMinutes')} />
        <StatTile icon="flame-outline" value={String(streak.days)} label={t('profile.statStreak')} accessibilityLabel={t('profile.streakAria', { days: String(streak.days)})} />
      </View>

      <Button title={t('profile.openSettings')} icon="settings-outline" variant="secondary" onPress={() => router.push(ROUTES.settings)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
});