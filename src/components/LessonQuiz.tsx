import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { OptionButton, type OptionState } from '@/components/OptionButton';
import { ProgressBar } from '@/components/ProgressBar';
import { Button, Text } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import type { Exercise, LessonResult, Vocabulary } from '@/types';
import { isolateLtr } from '@/utils/bidi';
import { answer, initialSession, isFinished, next } from '@/utils/lessonSession';

interface LessonQuizProps {
  exercises: Exercise[];
  words: Vocabulary[];
  onFinish: (result: LessonResult) => void;
}

const SOURCE_LANGUAGE = 'ar'; // meanings are shown in the learner's source language

export function LessonQuiz({ exercises, words, onFinish }: LessonQuizProps) {
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
    return askMeaning ? (word.translations[SOURCE_LANGUAGE] ?? '') : isolateLtr(word.term);
  };
  const subject = byId.get(exercise.subjectId);
  const prompt = askMeaning ? isolateLtr(subject?.term ?? '') : (subject?.translations[SOURCE_LANGUAGE] ?? '');
  const answered = session.selected !== null;
  const wasCorrect = session.selected === exercise.answer;
  const isLast = session.index === exercises.length - 1;

  const stateOf = (id: string): OptionState => {
    if (!answered) return 'idle';
    if (id === exercise.answer) return 'correct';
    return id === session.selected ? 'wrong' : 'dimmed';
  };

  const onNext = () => {
    if (isLast) onFinish({ correct: session.correct, total: exercises.length });
    else setSession(next(session));
  };

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ gap: spacing.xs }}>
        <ProgressBar value={session.index / exercises.length} accessibilityLabel={t('lesson.questionOf', { current: session.index + 1, total: exercises.length })} />
        <Text variant="caption" color="textSecondary">
          {t('lesson.questionOf', { current: session.index + 1, total: exercises.length })}
        </Text>
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text color="textSecondary">{t(askMeaning ? 'lesson.questionMeaning' : 'lesson.questionWord')}</Text>
        <Text variant="display" accessibilityRole="header">
          {prompt}
        </Text>
      </View>

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
          <Button title={t(isLast ? 'lesson.finish' : 'lesson.next')} onPress={onNext} />
        </View>
      ) : null}
    </View>
  );
}
