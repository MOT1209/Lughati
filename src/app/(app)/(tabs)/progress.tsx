import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ProgressBar } from '@/components/ProgressBar';
import { StatTile } from '@/components/StatTile';
import { EmptyState, ErrorState, LoadingState, Screen, Text } from '@/components/ui';
import { useCurrentLearning } from '@/hooks/useCurrentLearning';
import { useTheme } from '@/hooks/useTheme';

export default function Progress() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
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

  const { progress, lessons } = learning.data;
  if (!progress) {
    return (
      <Screen edges={['top']} contentStyle={{ justifyContent: 'center' }}>
        <EmptyState icon="stats-chart-outline" title={t('progress.emptyTitle')} message={t('progress.emptyMessage')} />
      </Screen>
    );
  }

  const done = progress.completedLessonIds.length;
  const ratio = lessons.length > 0 ? done / lessons.length : 0;

  return (
    <Screen edges={['top']}>
      <Text variant="title" accessibilityRole="header">
        {t('progress.title')}
      </Text>
      <View style={{ gap: spacing.sm }}>
        <Text color="textSecondary">{t('progress.overall')}</Text>
        <ProgressBar value={ratio} accessibilityLabel={t('progress.overall')} />
        <Text variant="small" color="textSecondary">
          {t('progress.lessonsRatio', { done, total: lessons.length })}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
        <StatTile icon="checkmark-done-outline" value={String(done)} label={t('progress.lessonsCompleted')} />
        <StatTile icon="flash-outline" value={String(progress.totalXp)} label={t('profile.statXp')} />
      </View>
    </Screen>
  );
}
