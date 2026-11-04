import { useMemo } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AiError } from '@/components/ai/AiError';
import { Button, Card, ErrorState, LoadingState, Screen, Text } from '@/components/ui';
import { useAiAction } from '@/hooks/useAiAction';
import { useAiContext } from '@/hooks/useAiContext';
import { useCurrentLearning } from '@/hooks/useCurrentLearning';
import { useTheme } from '@/hooks/useTheme';
import { buildPlannerStats, localAdvice, planLearning } from '@/services/ai';
import { isolate } from '@/utils/bidi';

export default function AiPlanner() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const { context } = useAiContext();
  const learning = useCurrentLearning();
  const stats = useMemo(
    () =>
      learning.status === 'success'
        ? buildPlannerStats({ progress: learning.data.progress, plan: learning.data.plan, streak: learning.data.streak, attempts: learning.data.attempts, lessons: learning.data.lessons, dueReviews: learning.data.dueVocabulary })
        : null,
    [learning],
  );
  const action = useAiAction(async (horizon: 'daily' | 'weekly') => {
    if (!context || !stats) throw new Error('no data');
    return planLearning(context, stats, horizon);
  });

  if (learning.status === 'loading') return <LoadingState />;
  if (learning.status === 'error') return <ErrorState error={learning.error} onRetry={learning.reload} />;
  if (!stats || !context) return <Text style={{ padding: spacing.lg }}>{t('ai.noProfile')}</Text>;

  const plan = action.state.status === 'success' ? action.state.data : null;
  return (
    <Screen edges={['bottom']}>
      <Card style={{ gap: spacing.xs }}>
        <Text variant="bodyStrong">{t('ai.planner.stats')}</Text>
        <Text>{t('ai.planner.lessons', { done: stats.completedLessons, total: stats.totalLessons })}</Text>
        <Text>{stats.accuracyPercent === null ? t('ai.planner.noAccuracy') : t('ai.planner.accuracy', { percent: stats.accuracyPercent })}</Text>
        <Text>{t('ai.planner.streak', { n: stats.streakDays })}</Text>
        <Text>{t('ai.planner.due', { n: stats.dueReviews })}</Text>
        <Text>{t('ai.planner.today', { done: stats.minutesToday, goal: stats.dailyGoalMinutes })}</Text>
      </Card>
      <Card style={{ gap: spacing.xs }}>
        <Text variant="bodyStrong">{t('ai.planner.advice')}</Text>
        {localAdvice(stats).map((a, i) => (
          <Text key={i}>
            •{' '}
            {a.kind === 'start'
              ? t('ai.planner.adviceStart')
              : a.kind === 'review-due'
                ? t('ai.planner.adviceReview', { n: a.count })
                : a.kind === 'daily-goal'
                  ? t('ai.planner.adviceGoal', { n: a.minutes })
                  : a.kind === 'weak-topic'
                    ? isolate(t('ai.planner.adviceWeak', { topic: a.topic }))
                    : t('ai.planner.adviceOnTrack')}
          </Text>
        ))}
      </Card>
      <Button title={t('ai.planner.aiDaily')} icon="sparkles-outline" onPress={() => void action.run('daily')} loading={action.loading} />
      <Button title={t('ai.planner.aiWeekly')} variant="secondary" icon="calendar-outline" onPress={() => void action.run('weekly')} disabled={action.loading} />
      {action.state.status === 'error' ? <AiError code={action.state.code} onRetry={() => void action.retry()} /> : null}
      {plan ? (
        <Card style={{ gap: spacing.sm }}>
          <Text>{isolate(plan.summary)}</Text>
          {plan.dailyTips.map((tip, i) => (
            <Text key={i} variant="small">
              • {isolate(tip)}
            </Text>
          ))}
          {plan.weeklyPlan.length > 0 ? (
            <View style={{ gap: spacing.xs }}>
              <Text variant="bodyStrong">{t('ai.planner.week')}</Text>
              {plan.weeklyPlan.map((d) => (
                <Text key={d.day} variant="small">
                  {isolate(`${d.day}: ${d.focus}`)} · {t('ai.planner.minutes', { n: d.minutes })}
                </Text>
              ))}
            </View>
          ) : null}
        </Card>
      ) : null}
      <Text variant="caption" color="textSecondary">
        {t('ai.disclaimer')}
      </Text>
    </Screen>
  );
}
