import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useReducer, useRef } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ProgressBar } from '@/components/ProgressBar';
import { Button, Card, EmptyState, ErrorState, Icon, Input, LoadingState, Screen, Text } from '@/components/ui';
import { MIN_TOUCH_TARGET } from '@/constants/app';
import { initialSession, sessionReducer } from '@/features/lesson/session';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useTheme } from '@/hooks/useTheme';
import { useUiLocale } from '@/hooks/useUiLocale';
import { getRepositories } from '@/services/repositories';
import { useAuthStore } from '@/store/authStore';
import { useCompletionStore } from '@/store/completionStore';
import { XP_PER_CORRECT_ANSWER } from '@/utils/answer';
import { isolateLtr } from '@/utils/bidi';
import { localize } from '@/utils/localize';

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { colors, radius, spacing } = useTheme();
  const { locale } = useUiLocale();
  const userId = useAuthStore((s) => s.session?.user.id ?? '');
  const recordCompletion = useCompletionStore((s) => s.recordCompletion);
  const [session, dispatch] = useReducer(sessionReducer, initialSession);
  const saved = useRef(false);

  const data = useAsyncData(async () => {
    const repos = getRepositories();
    const [lesson, exercises] = await Promise.all([repos.lessons.getById(id), repos.exercises.getByLesson(id)]);
    return { lesson, exercises };
  }, [id]);

  const finished = session.phase === 'finished';
  const total = data.status === 'success' ? data.data.exercises.length : 0;

  // Save once per run when the last exercise is done; "try again" re-arms it.
  useEffect(() => {
    if (finished && !saved.current) {
      saved.current = true;
      recordCompletion(userId, id, { correct: session.correct, total });
    }
  }, [finished, id, recordCompletion, session.correct, total, userId]);

  if (data.status === 'loading') return <Screen><LoadingState /></Screen>;
  if (data.status === 'error') return <Screen><ErrorState onRetry={data.reload} /></Screen>;

  const { lesson, exercises } = data.data;
  if (!lesson) return <Screen><EmptyState title={t('lesson.notFound')} message="" actionLabel={t('lesson.backToLessons')} onAction={() => router.back()} /></Screen>;
  if (exercises.length === 0) {
    return (
      <Screen>
        <EmptyState
          title={t('lesson.noExercisesTitle')}
          message={t('lesson.noExercisesMessage')}
          actionLabel={t('lesson.backToLessons')}
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  if (finished) {
    return (
      <Screen>
        <Card style={{ gap: spacing.md, alignItems: 'center' }}>
          <Icon name="trophy-outline" size={48} color="accent" />
          <Text variant="title" accessibilityRole="header">
            {t('lesson.resultTitle')}
          </Text>
          <Text variant="heading">{t('lesson.resultScore', { correct: session.correct, total })}</Text>
          <Text color="textSecondary">{t('lesson.xpEarned', { xp: session.correct * XP_PER_CORRECT_ANSWER })}</Text>
        </Card>
        <Button
          title={t('lesson.tryAgain')}
          variant="secondary"
          icon="refresh-outline"
          onPress={() => {
            saved.current = false;
            dispatch({ type: 'restart' });
          }}
        />
        <Button title={t('lesson.backToLessons')} onPress={() => router.back()} />
      </Screen>
    );
  }

  const exercise = exercises[session.index]!;
  const answering = session.phase === 'answering';
  const isLast = session.index + 1 >= exercises.length;

  return (
    <Screen>
      <Text variant="small" color="textSecondary">
        {localize(lesson.title, locale)}
      </Text>
      <ProgressBar
        value={session.index / exercises.length}
        accessibilityLabel={t('lesson.questionOf', { current: session.index + 1, total: exercises.length })}
      />
      <Text variant="small" color="textSecondary">
        {t('lesson.questionOf', { current: session.index + 1, total: exercises.length })}
      </Text>
      <Text variant="heading" accessibilityRole="header">
        {localize(exercise.prompt, locale)}
      </Text>

      {exercise.type === 'multiple-choice' ? (
        <View style={{ gap: spacing.sm }} accessibilityRole="radiogroup">
          {exercise.options?.map((option) => {
            const selected = session.input === option;
            const showRight = !answering && option === exercise.answer;
            const showWrong = !answering && selected && option !== exercise.answer;
            return (
              <Pressable
                key={option}
                disabled={!answering}
                onPress={() => dispatch({ type: 'input', value: option })}
                accessibilityRole="radio"
                accessibilityLabel={option}
                accessibilityState={{ selected, disabled: !answering }}
                style={{
                  minHeight: MIN_TOUCH_TARGET,
                  justifyContent: 'center',
                  padding: spacing.md,
                  borderRadius: radius.md,
                  borderWidth: selected || showRight ? 2 : 1,
                  borderColor: showWrong ? colors.error : showRight ? colors.success : selected ? colors.primary : colors.borderStrong,
                  backgroundColor: colors.surface,
                }}
              >
                <Text>{isolateLtr(option)}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Input
          label={t('lesson.typeAnswer')}
          value={session.input}
          onChangeText={(value) => dispatch({ type: 'input', value })}
          editable={answering}
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={() => dispatch({ type: 'check', exercise })}
        />
      )}

      {!answering ? (
        <View accessibilityLiveRegion="polite" style={{ gap: spacing.xs }}>
          <Text variant="bodyStrong" color={session.lastCorrect ? 'success' : 'error'}>
            {session.lastCorrect ? t('lesson.correct') : t('lesson.incorrect')}
          </Text>
          {!session.lastCorrect ? (
            <Text color="textSecondary">{t('lesson.correctAnswer', { answer: isolateLtr(exercise.answer) })}</Text>
          ) : null}
        </View>
      ) : null}

      {answering ? (
        <Button
          title={t('lesson.check')}
          disabled={session.input.trim() === ''}
          onPress={() => dispatch({ type: 'check', exercise })}
        />
      ) : (
        <Button
          title={isLast ? t('lesson.finish') : t('lesson.next')}
          onPress={() => dispatch({ type: 'next', total: exercises.length })}
        />
      )}
    </Screen>
  );
}

