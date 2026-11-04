import { router } from 'expo-router';
import type { TFunction } from 'i18next';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ContinueCard } from '@/components/home/ContinueCard';
import { HomeHero } from '@/components/home/HomeHero';
import { RecommendationRow } from '@/components/home/RecommendationRow';
import { ErrorState, LoadingState, Screen } from '@/components/ui';
import { useCurrentLearning } from '@/hooks/useCurrentLearning';
import { useTheme } from '@/hooks/useTheme';
import { useUiLocale } from '@/hooks/useUiLocale';
import type { Recommendation } from '@/types';
import { localize } from '@/utils/localize';
import { getRecommendations } from '@/utils/recommendations';
import { ROUTES } from '@/utils/routing';

/** How far the continue card overlaps the hero. */
const HERO_OVERLAP = 48;

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

  // "Lesson 3 of 10" counts within the lesson's level (the meta line already names the level).
  const levelLessons = lesson ? lessons.filter((l) => l.levelId === lesson.levelId) : [];
  const lessonIndex = lesson ? levelLessons.findIndex((l) => l.id === lesson.id) : -1;
  const continueLesson =
    lesson && progress
      ? {
          title: localize(lesson.title, locale),
          meta: t('home.lessonMeta', { level: lesson.levelId, count: lesson.estimatedMinutes }),
          position: lessonIndex >= 0 ? t('home.lessonPosition', { current: lessonIndex + 1, total: levelLessons.length }) : null,
          levelProgress: progress.levelProgress,
        }
      : null;

  return (
    <Screen edges={[]} contentStyle={{ padding: 0, gap: 0 }}>
      <HomeHero
        name={learning.user?.name ?? ''}
        streakDays={streak.days}
        language={language}
        languageName={language ? localize(language.name, locale) : ''}
        minutesToday={plan.minutesToday}
        goalMinutes={plan.dailyGoalMinutes}
        onChangeLanguage={() => router.push(ROUTES.languageSelection)}
        overlap={HERO_OVERLAP}
      />
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md, marginTop: -HERO_OVERLAP }}>
        <ContinueCard
          lesson={continueLesson}
          onContinue={() => lesson && router.push({ pathname: '/lesson/[id]', params: { id: lesson.id } })}
        />
        {recommendation ? (
          <RecommendationRow
            text={recommendationText(t, recommendation)}
            icon={recommendationToReview ? 'repeat' : 'sparkles'}
            onPress={openRecommendation}
          />
        ) : null}
      </View>
    </Screen>
  );
}
