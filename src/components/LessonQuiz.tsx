import { useState } from 'react';
import { Alert, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { OptionButton, type OptionState } from '@/components/OptionButton';
import { PronounceButton } from '@/components/PronounceButton';
import { ProgressBar } from '@/components/ProgressBar';
import { Button, Card, Text } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import type { Exercise, LanguageCode, LessonResult, Vocabulary } from '@/types';
import { answer, initialSession, isFinished, next } from '@/utils/lessonSession';
import { isolateTerm, meaningOf } from '@/utils/meaning';

interface LessonQuizProps {
  exercises: Exercise[];
  words: Vocabulary[];
  /** The learner's own language; meanings are shown in it. */
  source?: LanguageCode | null;
  onFinish: (result: LessonResult) => void;
}

export function LessonQuiz({ exercises, words, source, onFinish }: LessonQuizProps) {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const [session, setSession] = useState(initialSession);
  const byId = new Map(words.map((word) => [word.id, word]));

  const exercise = exercises[session.index];
  if (!exercise || isFinished(session, exercises.length)) return null;

  // 'multiple-choice' shows the target word and asks for its meaning; 'translate' is the reverse.
  const askMeaning = exercise.type === 'multiple-choice';
  const label = (id: string) => {
    const word = byId.get(id);
    if (!word) return '';
    return askMeaning ? meaningOf(word, source) : isolateTerm(word);
  };
  const subject = byId.get(exercise.subjectId);
  const prompt = subject ? (askMeaning ? isolateTerm(subject) : meaningOf(subject, source)) : '';
  const answered = session.selected !== null;
  const wasCorrect = session.selected === exercise.answer;
  const isLast = session.index === exercises.length - 1;

  const stateOf = (id: string): OptionState => {
    if (!answered) return 'idle';
    if (id === exercise.answer) return 'correct';
    return id === session.selected ? 'wrong' : 'dimmed';
  };

  const onNext = () => {
    if (isLast) {
      // Confirm before finishing the lesson; RN has no window.confirm, so use Alert.alert.
      Alert.alert(
        t('lesson.finishTitle'),
        t('lesson.finishConfirmation'),
        [
          { text: t('lesson.cancel'), style: 'cancel' },
          { text: t('lesson.finish'), onPress: () => onFinish({ correct: session.correct, total: exercises.length }) },
        ],
        { cancelable: false },
      );
    } else {
      setSession(next(session));
    }
  };

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ gap: spacing.xs }}>
        <ProgressBar value={session.index / exercises.length} accessibilityLabel={t('lesson.questionOf', { current: session.index + 1, total: exercises.length })} />
        <Text variant="caption" color="textSecondary">
          {t('lesson.questionOf', { current: session.index + 1, total: exercises.length })}
        </Text>
      </View>

      <Card style={{ gap: spacing.sm, alignItems: 'center', padding: spacing.xl }}>
        <Text variant="small" color="textSecondary" style={{ textAlign: 'center' }}>
          {t(askMeaning ? 'lesson.questionMeaning' : 'lesson.questionWord')}
        </Text>
        <Text variant="display" accessibilityRole="header" style={{ textAlign: 'center' }}>
          {prompt}
        </Text>
        {/* Only the word being asked about is spoken: reading a translate option would give it away. */}
        {askMeaning && subject ? <PronounceButton key={subject.id} text={subject.term} language={subject.targetLanguage} /> : null}
      </Card>

      <View style={{ gap: spacing.sm }}>
        {exercise.options.map((id) => (
          <OptionButton
            key={id}
            text={label(id)}
            accessibilityLabel={t('lesson.option', { text: label(id) })}
            state={stateOf(id)}
            disabled={answered}
            onPress={() => setSession(answer(session, exercise, id))}
          />
        ))}
      </View>

      {answered ? (
        <View style={{ gap: spacing.sm }} accessibilityLiveRegion="polite">
          <Text variant="bodyStrong" color={wasCorrect ? 'success' : 'error'}>
            {t(wasCorrect ? 'lesson.correct' : 'lesson.incorrect')}
          </Text>
          {!wasCorrect ? <Text color="textSecondary">{t('lesson.correctAnswerWas', { answer: label(exercise.answer) })}</Text> : null}
          <Button title={t(isLast ? 'lesson.finish' : 'lesson.next')} variant="gold" onPress={onNext} />
        </View>
      ) : null}
    </View>
  );
}
