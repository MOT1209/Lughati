import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { HeroProgress } from '@/components/HeroProgress';
import { ScreenHero } from '@/components/ScreenHero';
import { StreakChip } from '@/components/StreakChip';
import { Button, Card, ErrorState, LoadingState, Screen, StatTile, Text } from '@/components/ui';
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
        <ErrorState error={learning.error} message={t('progress.error')} onRetry={learning.reload} />
      </Screen>
    );
  }

  const { progress, streak, level, lesson } = learning.data;
  const completedLessons = progress?.completedLessonIds?.length ?? 0;
  const levelProgress = progress?.levelProgress ?? 0;
  const percent = Math.round(Math.min(1, Math.max(0, Number.isFinite(levelProgress) ? levelProgress : 0)) * 100);

  // The level label comes from the loaded level; the raw id is only a fallback when it is missing.
  const levelLabel = level ? localize(level.title, locale) : progress?.levelId ?? null;

  return (
    <Screen edges={[]} contentStyle={{ padding: 0, gap: 0 }}>
      <ScreenHero
        eyebrow={t('progress.title')}
        title={levelLabel ? t('progress.level', { level: levelLabel }) : t('progress.title')}
        trailing={<StreakChip days={streak.days} />}
      >
        <HeroProgress value={levelProgress} accessibilityLabel={t('home.overallProgress')} />
        <Text variant="caption" color="onHeroMuted">
          {t('home.overallProgressValue', { percent })}
        </Text>
      </ScreenHero>

      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        <View style={[styles.grid, { gap: spacing.md }]}>
          <StatTile highlight icon="flash-outline" value={String(progress?.totalXp ?? 0)} label={t('progress.statXp')} />
          <StatTile icon="text-outline" value={String(progress?.wordsLearned ?? 0)} label={t('progress.statWords')} />
          <StatTile icon="time-outline" value={String(progress?.minutesLearned ?? 0)} label={t('progress.statMinutes')} />
          <StatTile icon="school-outline" value={String(completedLessons)} label={t('progress.statLessons')} />
        </View>

        {lesson ? (
          <Card style={{ gap: spacing.xs }}>
            <Text variant="caption" color="primary">
              {t('progress.currentLesson')}
            </Text>
            <Text variant="heading">{localize(lesson.title, locale)}</Text>
            <Button
              title={t('progress.continueLearning')}
              variant="gold"
              icon="play"
              iconDirectional
              onPress={() => router.push({ pathname: '/lesson/[id]', params: { id: lesson.id } })}
              style={{ marginTop: spacing.sm }}
            />
          </Card>
        ) : (
          <Button title={t('progress.continueLearning')} variant="secondary" onPress={() => router.push(ROUTES.learn)} />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
});
