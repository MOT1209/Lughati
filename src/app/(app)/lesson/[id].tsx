import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { LessonQuiz } from '@/components/LessonQuiz';
import { Button, Card, EmptyState, ErrorState, LoadingState, Screen, Text } from '@/components/ui';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useTheme } from '@/hooks/useTheme';
import { useUiLocale } from '@/hooks/useUiLocale';
import { getRepositories } from '@/services/repositories';
import { useAuthStore } from '@/store/authStore';
import { useLearningStore } from '@/store/learningStore';
import type { LessonResult } from '@/types';
import { isolateLtr } from '@/utils/bidi';
import { localize } from '@/utils/localize';
import { XP_LESSON_BONUS, XP_PER_CORRECT_ANSWER } from '@/utils/progression';

type Step = 'intro' | 'quiz' | 'summary';

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const { locale } = useUiLocale();
  const userId = useAuthStore((s) => s.session?.user.id ?? '');
  const notifyProgressChanged = useLearningStore((s) => s.notifyProgressChanged);
  const [step, setStep] = useState<Step>('intro');
  const [result, setResult] = useState<LessonResult | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const saving = useRef(false); // a double tap on the last button must not record the lesson twice

  const data = useAsyncData(async () => {
    const repos = getRepositories();
    const [lesson, words, exercises] = await Promise.all([
      repos.lessons.getById(id),
      repos.lessons.getVocabulary(id),
      repos.lessons.getExercises(id),
    ]);
    return { lesson, words, exercises };
  }, [id]);

  if (data.status === 'loading') {
    return (
      <Screen edges={['bottom']}>
        <LoadingState />
      </Screen>
    );
  }
  if (data.status === 'error') {
    return (
      <Screen edges={['bottom']}>
        <ErrorState onRetry={data.reload} />
      </Screen>
    );
  }

  const { lesson, words, exercises } = data.data;
  if (!lesson) {
    return (
      <Screen edges={['bottom']}>
        <EmptyState title={t('lesson.title')} message={t('lesson.notFound')} actionLabel={t('lesson.backToLessons')} onAction={() => router.back()} />
      </Screen>
    );
  }

  const finish = async (final: LessonResult) => {
    if (saving.current) return;
    saving.current = true;
    setSaveFailed(false);
    setResult(final);
    try {
      await getRepositories().progress.completeLesson(userId, lesson.id, final);
      notifyProgressChanged();
      setStep('summary');
    } catch {
      setSaveFailed(true);
    } finally {
      saving.current = false;
    }
  };

  if (step === 'quiz') {
    return (
      <Screen edges={['bottom']}>
        <LessonQuiz exercises={exercises} words={words} onFinish={finish} />
        {saveFailed && result ? (
          <View style={{ gap: spacing.sm }} accessibilityLiveRegion="polite">
            <Text color="error">{t('lesson.saveFailed')}</Text>
            <Button title={t('common.retry')} onPress={() => finish(result)} />
          </View>
        ) : null}
      </Screen>
    );
  }

  if (step === 'summary' && result) {
    const xp = result.correct * XP_PER_CORRECT_ANSWER + XP_LESSON_BONUS;
    return (
      <Screen edges={['bottom']} contentStyle={{ justifyContent: 'center' }}>
        <Card style={{ gap: spacing.md, alignItems: 'center' }}>
          <Text variant="title" accessibilityRole="header" style={{ textAlign: 'center' }}>
            {t('lesson.summaryTitle')}
          </Text>
          <Text>{t('lesson.summaryScore', { correct: result.correct, total: result.total })}</Text>
          <Text color="textSecondary">{t('lesson.summaryXp', { xp })}</Text>
        </Card>
        <Button title={t('lesson.backToLessons')} icon="arrow-back-outline" iconDirectional onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen edges={['bottom']}>
      <View style={{ gap: spacing.xs }}>
        <Text variant="title" accessibilityRole="header">
          {localize(lesson.title, locale)}
        </Text>
        <Text color="textSecondary">{localize(lesson.summary, locale)}</Text>
      </View>

      <Card style={{ gap: spacing.md }}>
        <Text variant="subheading">{t('lesson.vocabulary')}</Text>
        {words.map((word) => (
          <View key={word.id} style={{ gap: 2 }} accessible accessibilityLabel={`${word.term}: ${word.translations.ar ?? ''}`}>
            <Text variant="bodyStrong">{isolateLtr(word.term)}</Text>
            <Text variant="small" color="textSecondary">
              {word.translations.ar}
            </Text>
          </View>
        ))}
      </Card>

      {exercises.length === 0 ? (
        <Text color="textSecondary">{t('lesson.noExercises')}</Text>
      ) : (
        <Button title={t('lesson.start')} icon="play-outline" iconDirectional onPress={() => setStep('quiz')} />
      )}
    </Screen>
  );
}
