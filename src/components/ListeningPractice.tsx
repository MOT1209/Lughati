import { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { OptionButton, type OptionState } from '@/components/OptionButton';
import { ProgressBar } from '@/components/ProgressBar';
import { Button, Card, Text } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { getSpeechService } from '@/services/speech';
import type { LanguageCode, LessonResult, Vocabulary } from '@/types';
import { buildListeningExercises } from '@/utils/exercises';
import { isolateTerm, meaningOf } from '@/utils/meaning';

interface ListeningPracticeProps {
  lessonId: string;
  words: Vocabulary[];
  /** The learner's own language; meanings are shown in it after each answer. */
  source?: LanguageCode | null;
  /** Called once, when the learner finishes the last question. Persist the attempt here. */
  onFinish?: (result: LessonResult) => Promise<void> | void;
  /** Called when the learner leaves the summary. */
  onExit?: () => void;
}

/**
 * "Hear it, pick the written word": one question per lesson word, read by the device's voice.
 * Nothing plays on its own (the learner presses Listen), so it never talks over a screen reader.
 * The options unlock once the word has been played, so a question cannot be answered unheard.
 * A practice run: it records an attempt, never a lesson completion.
 */
export function ListeningPractice({ lessonId, words, source = null, onFinish, onExit }: ListeningPracticeProps) {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const exercises = useMemo(() => buildListeningExercises(lessonId, words), [lessonId, words]);
  const byId = useMemo(() => new Map(words.map((word) => [word.id, word])), [words]);
  const [index, setIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [heard, setHeard] = useState(false); // the current word was played at least once
  const [speaking, setSpeaking] = useState(false);
  const [phase, setPhase] = useState<'playing' | 'finished'>('playing');
  const [savedResult, setSavedResult] = useState<LessonResult | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const saving = useRef(false); // a double tap must not record the attempt twice
  const mounted = useRef(true);
  const ownsSpeech = useRef(false);

  // Leaving the practice stops a word that is still being read.
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (ownsSpeech.current) getSpeechService().stop();
    };
  }, []);

  const total = exercises.length;
  if (total === 0) {
    return <Text color="textSecondary">{t('practice.needWords')}</Text>;
  }
  const result = savedResult ?? { correct, total };

  const playAgain = () => {
    setIndex(0);
    setSelectedId(null);
    setCorrect(0);
    setHeard(false);
    setSavedResult(null);
    setSaveFailed(false);
    setPhase('playing');
  };

  if (phase === 'finished') {
    return (
      <View style={{ gap: spacing.md }}>
        <Text variant="title" accessibilityRole="header" style={{ textAlign: 'center' }}>
          {t('listening.summaryTitle')}
        </Text>
        <Text style={{ textAlign: 'center' }}>{t('listening.summaryScore', { correct: result.correct, total: result.total })}</Text>
        <Button title={t('common.retry')} variant="secondary" onPress={playAgain} />
        {onExit ? <Button title={t('common.continue')} icon="arrow-forward-outline" iconDirectional onPress={onExit} /> : null}
      </View>
    );
  }

  const exercise = exercises[index]!;
  const subject = byId.get(exercise.subjectId);
  if (!subject) return null;
  const answered = selectedId !== null;
  const wasCorrect = selectedId === exercise.answer;
  const isLast = index === total - 1;

  const listen = () => {
    ownsSpeech.current = true;
    setSpeaking(true);
    setHeard(true);
    getSpeechService().speak(subject.term, subject.targetLanguage, {
      onEnd: () => {
        ownsSpeech.current = false;
        if (mounted.current) setSpeaking(false);
      },
    });
  };

  const label = (id: string) => {
    const word = byId.get(id);
    return word ? isolateTerm(word) : '';
  };

  const stateOf = (id: string): OptionState => {
    if (!answered) return 'idle';
    if (id === exercise.answer) return 'correct';
    return id === selectedId ? 'wrong' : 'dimmed';
  };

  const onSelect = (id: string) => {
    if (answered || !heard) return;
    setSelectedId(id);
    if (id === exercise.answer) setCorrect((n) => n + 1);
  };

  const finalize = async (final: LessonResult) => {
    if (saving.current) return;
    saving.current = true;
    setSaveFailed(false);
    setSavedResult(final);
    try {
      if (onFinish) await onFinish(final);
      setPhase('finished');
    } catch {
      setSaveFailed(true);
    } finally {
      saving.current = false;
    }
  };

  const onNext = () => {
    if (isLast) {
      void finalize({ correct, total });
      return;
    }
    // The next question starts silent: a word still being read must not carry over.
    if (ownsSpeech.current) getSpeechService().stop();
    setSelectedId(null);
    setHeard(false);
    setIndex((i) => i + 1);
  };

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ gap: spacing.xs }}>
        <ProgressBar value={index / total} accessibilityLabel={t('lesson.questionOf', { current: index + 1, total })} />
        <Text variant="caption" color="textSecondary">
          {t('lesson.questionOf', { current: index + 1, total })}
        </Text>
      </View>

      <Card style={{ gap: spacing.md, alignItems: 'center', padding: spacing.xl }}>
        <Text variant="subheading" accessibilityRole="header" style={{ textAlign: 'center' }}>
          {t('listening.instruction')}
        </Text>
        <Button
          title={t(heard ? 'listening.listenAgain' : 'listening.listen')}
          variant="gold"
          icon={speaking ? 'volume-high' : 'volume-high-outline'}
          onPress={listen}
        />
        {heard ? null : (
          <Text variant="caption" color="textSecondary">
            {t('listening.listenFirst')}
          </Text>
        )}
      </Card>

      <View style={{ gap: spacing.sm }}>
        {exercise.options.map((id) => (
          <OptionButton
            key={id}
            text={label(id)}
            accessibilityLabel={t('lesson.option', { text: label(id) })}
            state={stateOf(id)}
            disabled={answered || !heard}
            onPress={() => onSelect(id)}
          />
        ))}
      </View>

      {answered ? (
        <View style={{ gap: spacing.sm }} accessibilityLiveRegion="polite">
          <Text variant="bodyStrong" color={wasCorrect ? 'success' : 'error'}>
            {t(wasCorrect ? 'lesson.correct' : 'lesson.incorrect')}
          </Text>
          <Text color="textSecondary">{t('listening.wordWas', { term: isolateTerm(subject), meaning: meaningOf(subject, source) })}</Text>
          {saveFailed ? <Text color="error">{t('lesson.saveFailed')}</Text> : null}
          {saveFailed ? (
            <Button title={t('common.retry')} onPress={() => void finalize(result)} />
          ) : (
            <Button title={t(isLast ? 'lesson.finish' : 'lesson.next')} onPress={onNext} />
          )}
        </View>
      ) : null}
    </View>
  );
}
