import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { LessonQuiz } from '@/components/LessonQuiz';
import { MIN_MATCH_WORDS, VocabularyMatchGame } from '@/components/VocabularyMatchGame';
import { Button, Card, EmptyState, ErrorState, LoadingState, Screen, Text } from '@/components/ui';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useTheme } from '@/hooks/useTheme';
import { useUiLocale } from '@/hooks/useUiLocale';
import { getRepositories } from '@/services/repositories';
import { useAuthStore } from '@/store/authStore';
import { useLearningStore } from '@/store/learningStore';
import type { LessonResult } from '@/types';
import { localize } from '@/utils/localize';
import { isolateTerm, meaningOf } from '@/utils/meaning';
import { isPassed, lessonXp, PASS_RATIO } from '@/utils/progression';

type Step = 'intro' | 'quiz' | 'practice' | 'summary';

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const { locale } = useUiLocale();
  const userId = useAuthStore((s) => s.session?.user.id ?? '');
  const notifyProgressChanged = useLearningStore((s) => s.notifyProgressChanged);
  const source = useLearningStore((s) => s.profile?.source ?? null);
  const [step, setStep] = useState<Step>('intro');
  const [result, setResult] = useState<LessonResult | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [quizRun, setQuizRun] = useState(0); // a new run remounts the quiz with a fresh session
  const saving = useRef(false); // a double tap on the last button must not record the lesson twice

  // Leaving mid-quiz (header back, gesture or hardware back) loses every answer: ask first.
  const navigation = useNavigation();
  const quizActive = step === 'quiz';
  useEffect(() => {
    if (!quizActive) return;
    return navigation.addListener('beforeRemove', (event) => {
      event.preventDefault();
      Alert.alert(t('lesson.leaveTitle'), t('lesson.leaveMessage'), [
        { text: t('lesson.leaveStay'), style: 'cancel' },
        { text: t('lesson.leaveConfirm'), style: 'destructive', onPress: () => navigation.dispatch(event.data.action) },
      ]);
    });
  }, [quizActive, navigation, t]);

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
        <ErrorState error={data.error} onRetry={data.reload} />
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

  // Practice records an attempt (not a completion): the lesson's progression stays untouched.
  const persistPractice = async (practice: LessonResult) => {
    await getRepositories().progress.recordAttempt(userId, lesson.id, practice, { completed: false });
    notifyProgressChanged();
  };

  if (step === 'practice') {
    return (
      <Screen edges={['bottom']}>
        <VocabularyMatchGame
          words={words}
          source={source}
          onFinish={persistPractice}
          onExit={() => setStep('intro')}
        />
      </Screen>
    );
  }

  if (step === 'quiz') {
    return (
      <Screen edges={['bottom']}>
        <LessonQuiz key={quizRun} exercises={exercises} words={words} source={source} onFinish={finish} />
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
    const passed = isPassed(result);
    const retryLesson = () => {
      setResult(null);
      setQuizRun((run) => run + 1);
      setStep('quiz');
    };
    return (
      <Screen edges={['bottom']} contentStyle={{ justifyContent: 'center' }}>
        <Card style={{ gap: spacing.md, alignItems: 'center' }}>
          <Text variant="title" accessibilityRole="header" style={{ textAlign: 'center' }}>
            {t(passed ? 'lesson.summaryTitle' : 'lesson.notPassedTitle')}
          </Text>
          <Text>{t('lesson.summaryScore', { correct: result.correct, total: result.total })}</Text>
          {passed ? null : (
            <Text color="textSecondary" style={{ textAlign: 'center' }}>
              {t('lesson.notPassedMessage', { percent: Math.round(PASS_RATIO * 100) })}
            </Text>
          )}
          <Text color="textSecondary">{t('lesson.summaryXp', { xp: lessonXp(result) })}</Text>
        </Card>
        {passed ? null : <Button title={t('lesson.retryLesson')} icon="refresh-outline" onPress={retryLesson} />}
        <Button
          title={t('lesson.backToLessons')}
          variant={passed ? 'primary' : 'secondary'}
          icon="arrow-back-outline"
          iconDirectional
          onPress={() => router.back()}
        />
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
          <View key={word.id} style={{ gap: 2 }} accessible accessibilityLabel={`${word.term}: ${meaningOf(word, source)}`}>
            <Text variant="bodyStrong">{isolateTerm(word)}</Text>
            <Text variant="small" color="textSecondary">
              {meaningOf(word, source)}
            </Text>
          </View>
        ))}
      </Card>

      {exercises.length === 0 ? (
        <Text color="textSecondary">{t('lesson.noExercises')}</Text>
      ) : (
        <Button title={t('lesson.start')} icon="play-outline" iconDirectional onPress={() => setStep('quiz')} />
      )}

      {words.length >= MIN_MATCH_WORDS ? (
        <Button
          title={t('practice.play')}
          variant="secondary"
          icon="game-controller-outline"
          onPress={() => setStep('practice')}
        />
      ) : null}
    </Screen>
  );
}
