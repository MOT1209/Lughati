import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { LessonQuiz } from '@/components/LessonQuiz';
import { MIN_MATCH_WORDS, VocabularyMatchGame } from '@/components/VocabularyMatchGame';
import { PronounceButton } from '@/components/PronounceButton';
import { ScreenHero } from '@/components/ScreenHero';
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
  const { colors, spacing, radius } = useTheme();
  const { locale } = useUiLocale();
  const userId = useAuthStore((s) => s.session?.user.id ?? '');
  const notifyProgressChanged = useLearningStore((s) => s.notifyProgressChanged);
  const source = useLearningStore((s) => s.profile?.source ?? null);
  const [step, setStep] = useState<Step>('intro');
  const [result, setResult] = useState<LessonResult | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [quizRun, setQuizRun] = useState(0); // a new run remounts the quiz with a fresh session
  const saving = useRef(false); // a double tap on the last button must not record the lesson twice
  const navigation = useNavigation();

  // Leaving mid-quiz (header back, Android back, a swipe) would drop every answer given so far,
  // so ask first. Other steps have nothing unsaved and leave without a prompt.
  useEffect(() => {
    if (step !== 'quiz') return;
    return navigation.addListener('beforeRemove', (event) => {
      event.preventDefault();
      Alert.alert(t('lesson.leaveTitle'), t('lesson.leaveMessage'), [
        { text: t('lesson.stay'), style: 'cancel' },
        { text: t('lesson.leaveConfirm'), style: 'destructive', onPress: () => navigation.dispatch(event.data.action) },
      ]);
    });
  }, [navigation, step, t]);

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
        <LinearGradient
          colors={[colors.heroStart, colors.heroMid, colors.heroEnd]}
          locations={[0, 0.5, 1]}
          start={{ x: 1, y: 0 }}
          end={{ x: 0.2, y: 1 }}
          style={{ borderRadius: radius.xl, padding: spacing.xl, gap: spacing.sm, alignItems: 'center' }}
        >
          <Text variant="title" color="onHero" accessibilityRole="header" style={{ textAlign: 'center' }}>
            {t(passed ? 'lesson.summaryTitle' : 'lesson.notPassedTitle')}
          </Text>
          <Text variant="display" color="heroGold">
            {t('lesson.summaryScore', { correct: result.correct, total: result.total })}
          </Text>
          {passed ? null : (
            <Text color="onHeroMuted" style={{ textAlign: 'center' }}>
              {t('lesson.notPassedMessage', { percent: Math.round(PASS_RATIO * 100) })}
            </Text>
          )}
          <Text color="onHeroMuted">{t('lesson.summaryXp', { xp: lessonXp(result) })}</Text>
        </LinearGradient>
        {passed ? null : <Button title={t('lesson.retryLesson')} variant="gold" icon="refresh-outline" onPress={retryLesson} />}
        <Button
          title={t('lesson.backToLessons')}
          variant={passed ? 'gold' : 'secondary'}
          icon="arrow-back-outline"
          iconDirectional
          onPress={() => router.back()}
        />
      </Screen>
    );
  }

  return (
    <Screen edges={['bottom']} contentStyle={{ padding: 0, gap: 0 }}>
      <ScreenHero
        topInset={false}
        eyebrow={t('home.lessonMeta', { level: lesson.levelId, count: lesson.estimatedMinutes })}
        title={localize(lesson.title, locale)}
      >
        <Text color="onHeroMuted">{localize(lesson.summary, locale)}</Text>
      </ScreenHero>

      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        <Card style={{ gap: spacing.md }}>
          <Text variant="subheading">{t('lesson.vocabulary')}</Text>
          {words.map((word, i) => (
            <View
              key={word.id}
              style={[
                styles.word,
                { gap: spacing.md, paddingTop: i === 0 ? 0 : spacing.sm, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.border },
              ]}
            >
              {/* Word and meaning are read as one item; the listen button stays its own control. */}
              <View
                style={[styles.word, styles.flex, { gap: spacing.md }]}
                accessible
                accessibilityLabel={`${word.term}: ${meaningOf(word, source)}`}
              >
                <Text variant="bodyStrong" style={styles.flex}>
                  {isolateTerm(word)}
                </Text>
                <Text variant="small" color="textSecondary" style={styles.flex}>
                  {meaningOf(word, source)}
                </Text>
              </View>
              <PronounceButton text={word.term} language={word.targetLanguage} />
            </View>
          ))}
        </Card>

        {exercises.length === 0 ? (
          <Text color="textSecondary">{t('lesson.noExercises')}</Text>
        ) : (
          <Button title={t('lesson.start')} variant="gold" icon="play-outline" iconDirectional onPress={() => setStep('quiz')} />
        )}

        {words.length >= MIN_MATCH_WORDS ? (
          <Button
            title={t('practice.play')}
            variant="secondary"
            icon="game-controller-outline"
            onPress={() => setStep('practice')}
          />
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  word: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  flex: { flex: 1 },
});
