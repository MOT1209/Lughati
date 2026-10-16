import { router } from 'expo-router';
import type { TFunction } from 'i18next';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { LanguageBadge } from '@/components/LanguageBadge';
import { ProgressBar } from '@/components/ProgressBar';
import { Button, Card, ErrorState, Icon, LoadingState, Screen, Text } from '@/components/ui';
import { useCurrentLearning } from '@/hooks/useCurrentLearning';
import { useTheme } from '@/hooks/useTheme';
import { useUiLocale } from '@/hooks/useUiLocale';
import type { Recommendation } from '@/types';
import { isolateNative } from '@/utils/bidi';
import { localize } from '@/utils/localize';
import { getRecommendations } from '@/utils/recommendations';
import { ROUTES } from '@/utils/routing';

/**
 * The engine returns plain numbers, so every rule can be read in the learner's own language and
 * order. `kind` is the whole switch: a new rule cannot ship without copy here.
 */
function recommendationText(t: TFunction, recommendation: Recommendation): string {
  const params = recommendation.params ?? {};
  switch (recommendation.kind) {
    case 'daily-goal':
      return t('home.recDailyGoal', { minutes: params.minutes ?? 0 });
    case 'review-due':
      return t('home.recReviewDue', { count: params.count ?? 0 });
    case 'retry-lesson':
      return t('home.recRetryLesson', { percent: params.percent ?? 0 });
    case 'continue-lesson':
      return t('home.recContinueLesson');
    case 'continue-unit':
      return t('home.recContinueUnit');
  }
}

export default function Home() {
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
        <ErrorState error={learning.error} onRetry={learning.reload} />
      </Screen>
    );
  }

  const { language, progress, plan, lesson, streak, attempts, dueVocabulary, lessons } = learning.data;
  const goalRatio = plan.dailyGoalMinutes > 0 ? plan.minutesToday / plan.dailyGoalMinutes : 0;
  const goalReached = plan.minutesToday >= plan.dailyGoalMinutes;

  // The top rule wins; it is always derived from recorded data, never guessed.
  const recommendation = progress
    ? (getRecommendations({ progress, attempts, dueVocabulary, plan, lessons })[0] ?? null)
    : null;
  const recommendationToReview = recommendation?.kind === 'review-due';
  const recommendationLessonId = recommendation?.lessonId ?? lesson?.id ?? null;

  const openRecommendation = () => {
    if (recommendationToReview) {
      router.push(ROUTES.review);
      return;
    }
    if (recommendationLessonId) {
      router.push({ pathname: '/lesson/[id]', params: { id: recommendationLessonId } });
      return;
    }
    router.push(ROUTES.learn);
  };

  return (
    <Screen edges={['top']}>
      <Text variant="title" accessibilityRole="header">
        {t('home.greeting', { name: learning.user?.name ?? '' })}</Text>

      <Card style={{ gap: spacing.md }}>
        <Text variant="small" color="textSecondary">
          {t('home.currentLanguage')}
        </Text>
        <View style={[styles.row, { gap: spacing.md }]}>
          {language ? <LanguageBadge language={language} /> : null}
          <View style={styles.flex}>
            <Text variant="heading">{language ? localize(language.name, locale) : ''}</Text>
            {language && language.nativeName !== localize(language.name, locale) ? (
              <Text variant="small" color="textSecondary">
                {isolateNative(language.nativeName, language.direction)}
              </Text>
            ) : null}
          </View>
        </View>
        {language ? (
          <Button title={t('home.changeLanguage')} variant="secondary" icon="swap-horizontal-outline" onPress={() => router.push(ROUTES.languageSelection)} />
        ) : null}
      </Card>

      <Card style={{ gap: spacing.sm }}>
        <Text variant="subheading">{t('home.dailyGoal')}</Text>
        <ProgressBar value={goalRatio} accessibilityLabel={t('home.dailyGoal')} />
        <Text variant="small" color="textSecondary">
          {goalReached ? t('home.dailyGoalDone') : t('home.dailyGoalProgress', { done: plan.minutesToday, goal: plan.dailyGoalMinutes })}
        </Text>
      </Card>

      {recommendation ? (
        <Card style={{ gap: spacing.sm }}>
          <Text variant="subheading">{t('home.recommended')}</Text>
          <Text>{recommendationText(t, recommendation)}</Text>
          <Button
            title={recommendationToReview ? t('tabs.review') : t('home.continueLearning')}
            icon={recommendationToReview ? 'repeat-outline' : 'play-outline'}
            iconDirectional
            onPress={openRecommendation}
          />
        </Card>
      ) : null}

      {lesson && progress ? (
        <Card style={{ gap: spacing.sm }}>
          <Text variant="subheading">{t('home.continueLearning')}</Text>
          <Text variant="heading">{localize(lesson.title, locale)}</Text>
          <Text variant="small" color="textSecondary">
            {t('home.lessonMeta', { level: lesson.levelId, count: lesson.estimatedMinutes })}
          </Text>
          <ProgressBar value={progress.levelProgress} accessibilityLabel={t('home.overallProgress')} />
          <Button title={t('home.continueLearning')} icon="play-outline" iconDirectional onPress={() => router.push({ pathname: '/lesson/[id]', params: { id: lesson.id } })} />
        </Card>
      ) : (
        // currentLessonId === null means "no current lesson", not an error.
        <Card style={{ gap: spacing.sm }}>
          <Text variant="subheading">{t('home.noCurrentLesson')}</Text>
          <Text variant="small" color="textSecondary">
            {t('home.noCurrentLessonBody')}
          </Text>
        </Card>
      )}

      <Card style={[styles.row, { gap: spacing.md }]}>
        <Icon name="flame" size={32} color="accent" />
        <View style={styles.flex} accessible accessibilityLabel={t('home.streakAria', { days: String(streak.days)})}>
          <Text variant="small" color="textSecondary">
            {t('home.streak')}
          </Text>
          <Text variant="heading">{t('home.streakDays', { count: streak.days })}</Text>
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
});