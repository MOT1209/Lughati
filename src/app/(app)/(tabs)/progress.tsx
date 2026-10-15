import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ProgressBar } from '@/components/ProgressBar';
import { Card, EmptyState, ErrorState, StatTile, Button, Screen, Text } from '@/components/ui';
import { useCurrentLearning } from '@/hooks/useCurrentLearning';
import { useTheme } from '@/hooks/useTheme';
import { useUiLocale } from '@/hooks/useUiLocale';
import { localize } from '@/utils/localize';
import { ROUTES } from '@/utils/routing';

export default function Progress() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { locale } = useUiLocale();
  const learning = useCurrentLearning();

  if (learning.status === 'loading') {
    return (
      <Screen edges={['top']}>
        <ProgressBar value={0} accessibilityLabel={t('progress.loading')} />
      </Screen>
    );
  }
  if (learning.status === 'error') {
    return (
      <Screen edges={['top']}>
        <Text variant="heading" style={{ textAlign: 'center' }}>
          {t('progress.error')}
        </Text>
      </Screen>
    );
  }

  const { progress, streak } = learning.data;
  const completedLessons = progress?.completedLessonIds?.length ?? 0;

  const xp = progress?.totalXp ?? 0;
  const words = progress?.wordsLearned ?? 0;
  const minutes = progress?.minutesLearned ?? 0;

  return (
    <Screen edges={['top']}>
      <Text variant="title" style={{ textAlign: 'center' }}>
        {t('progress.title')}
      </Text>

      <Card style={{ gap: 'md' }}>
        <Text style={{ textAlign: 'center' }}>
          Level {progress?.levelId ?? 'A1'}
        </Text>

        <View style={styles.summary} accessible accessibilityLabel={t('progress.summaryAria') + ' ' + String(xp) + ' ' + String(words) + ' ' + String(minutes)}>
          <Text style={{ textAlign: 'center' }}>
            {t('progress.xp')} {xp}
          </Text>
          <Text style={{ textAlign: 'center' }}>
            {t('progress.words')} {words}
          </Text>
          <Text style={{ textAlign: 'center' }}>
            {t('progress.minutes')} {minutes}
          </Text>
        </View>

        <View style={styles.grid}>
          <StatTile icon="flash-outline" value={String(xp)} label={t('progress.statXp')} />
          <StatTile icon="text-outline" value={String(words)} label={t('progress.statWords')} />
          <StatTile icon="time-outline" value={String(minutes)} label={t('progress.statMinutes')} />
          <StatTile icon="flame-outline" value={String(streak.days)} label={t('progress.statStreak')} />
          <StatTile icon="school-outline" value={String(completedLessons)} label={t('progress.statLessons')} />
        </View>
      </Card>

      {progress?.currentLessonId ? (
        <Card style={{ gap: 'sm', marginTop: 12 }}>
          <Text variant="subtitle" color="textSecondary">
            {t('progress.currentLesson')}
          </Text>
          <Text variant="bodyStrong">
            {localize(progress.currentLessonId, locale)}
          </Text>
        </Card>
      ) : null}

      <View style={{ marginTop: 24, alignItems: 'center' }}>
        <Button title={t('progress.continueLearning')} variant="secondary" onPress={() => router.push(ROUTES.learn)} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 24, padding: 24 },
  summary: { gap: 8, marginBottom: 8, borderRadius: 12, borderWidth: 1, padding: 16, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
});