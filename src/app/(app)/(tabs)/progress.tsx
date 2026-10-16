import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ProgressBar } from '@/components/ProgressBar';
import { Card, ErrorState, LoadingState, StatTile, Button, Screen, Text } from '@/components/ui';
import { useCurrentLearning } from '@/hooks/useCurrentLearning';
import { useTheme } from '@/hooks/useTheme';
import { useUiLocale } from '@/hooks/useUiLocale';
import { localize } from '@/utils/localize';
import { ROUTES } from '@/utils/routing';

export default function Progress() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const { locale } = useUiLocale();
  const learning = useCurrentLearning();

  if (learning.status === 'loading') {
    return (
      <Screen edges={['top']}>
        <LoadingState message={t('progress.loading')} />
      </Screen>
    );
  }
  if (learning.status === 'error') {
    return (
      <Screen edges={['top']}>
        <ErrorState message={t('progress.error')} onRetry={learning.reload} />
      </Screen>
    );
  }

  const { progress, streak, level, lesson } = learning.data;
  const completedLessons = progress?.completedLessonIds?.length ?? 0;

  const xp = progress?.totalXp ?? 0;
  const words = progress?.wordsLearned ?? 0;
  const minutes = progress?.minutesLearned ?? 0;

  // The level label comes from the loaded level; the raw id is only a fallback when it is missing.
  const levelLabel = level ? localize(level.title, locale) : progress?.levelId ?? null;

  return (
    <Screen edges={['top']}>
      <Text variant="title" style={styles.centerText} accessibilityRole="header">
        {t('progress.title')}
      </Text>

      <Card style={{ gap: spacing.md }}>
        {levelLabel ? (
          <Text style={styles.centerText}>{t('progress.level', { level: levelLabel })}</Text>
        ) : null}

        <View
          accessible
          accessibilityLabel={t('progress.summaryAria', { xp, words, minutes })}
          style={{ gap: spacing.sm }}
        >
          <Text style={styles.centerText}>{t('progress.xp', { xp })}</Text>
          <Text style={styles.centerText}>{t('progress.words', { words })}</Text>
          <Text style={styles.centerText}>{t('progress.minutes', { minutes })}</Text>
        </View>

        <View style={[styles.grid, { gap: spacing.md }]}>
          <StatTile icon="flash-outline" value={String(xp)} label={t('progress.statXp')} />
          <StatTile icon="text-outline" value={String(words)} label={t('progress.statWords')} />
          <StatTile icon="time-outline" value={String(minutes)} label={t('progress.statMinutes')} />
          <StatTile icon="flame-outline" value={String(streak.days)} label={t('progress.statStreak')} />
          <StatTile icon="school-outline" value={String(completedLessons)} label={t('progress.statLessons')} />
        </View>
      </Card>

      {lesson ? (
        <Card style={{ gap: spacing.sm }}>
          <Text variant="small" color="textSecondary">
            {t('progress.currentLesson')}
          </Text>
          <Text variant="bodyStrong">{localize(lesson.title, locale)}</Text>
          <ProgressBar
            value={progress?.levelProgress ?? 0}
            accessibilityLabel={t('home.overallProgress')}
          />
          <Button
            title={t('progress.continueLearning')}
            variant="secondary"
            onPress={() => router.push(ROUTES.lesson(lesson.id))}
          />
        </Card>
      ) : null}

      <View style={[styles.footer, { marginTop: spacing.xl }]}>
        <Button title={t('progress.continueLearning')} variant="secondary" onPress={() => router.push(ROUTES.learn)} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centerText: { textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  footer: { alignItems: 'center' },
});
