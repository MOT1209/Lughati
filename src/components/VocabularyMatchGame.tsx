import { useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { OptionButton, type OptionState } from '@/components/OptionButton';
import { ProgressBar } from '@/components/ProgressBar';
import { Button, Text } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import type { LanguageCode, LessonResult, Vocabulary } from '@/types';
import { isolateTerm, meaningOf } from '@/utils/meaning';

/** A match round needs at least this many words to build meaningful options. */
export const MIN_MATCH_WORDS = 4;

/** Options per question: the answer plus distractors. */
const OPTION_COUNT = 4;

interface MatchQuestion {
  /** The word to translate; its meaning is the correct option. */
  wordId: string;
  /** Vocabulary ids offered as answers, in display order. Always contains `wordId`. */
  optionIds: string[];
}

interface VocabularyMatchGameProps {
  words: Vocabulary[];
  source?: LanguageCode | null;
  /** Called once, when the learner answers the last question. Persist the attempt here. */
  onFinish?: (result: LessonResult) => Promise<void> | void;
  /** Called when the learner leaves the summary. */
  onExit?: () => void;
  /** Injectable RNG so shuffles are deterministic under test. */
  random?: () => number;
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * One question per playable word: show the word, pick its meaning from `OPTION_COUNT` options.
 * Words without a meaning in the learner's language are skipped rather than shown blank.
 *
 * Exported for tests: the shuffle is driven entirely by `random`, so a fixed RNG is deterministic.
 */
export function buildMatchSession(
  words: Vocabulary[],
  source: LanguageCode | null,
  random: () => number = Math.random,
): MatchQuestion[] {
  const playable = words.filter((word) => meaningOf(word, source).trim() !== '');
  if (playable.length < MIN_MATCH_WORDS) return []; // fewer would mean fewer than OPTION_COUNT options
  return shuffle(playable, random).map((word) => {
    const distractors = shuffle(
      playable.filter((other) => other.id !== word.id),
      random,
    ).slice(0, OPTION_COUNT - 1);
    return { wordId: word.id, optionIds: shuffle([word.id, ...distractors.map((d) => d.id)], random) };
  });
}

export function VocabularyMatchGame({ words, source = null, onFinish, onExit, random = Math.random }: VocabularyMatchGameProps) {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  // Built once per session (a replay rebuilds it) so options never reshuffle mid-question.
  const [questions, setQuestions] = useState(() => buildMatchSession(words, source, random));
  const [index, setIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [phase, setPhase] = useState<'playing' | 'finished'>('playing');
  const [savedResult, setSavedResult] = useState<LessonResult | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const saving = useRef(false); // a double tap must not record the attempt twice

  const byId = useMemo(() => new Map(words.map((word) => [word.id, word])), [words]);

  const total = questions.length;
  const result = savedResult ?? { correct, total };
  const currentWord = index < total ? byId.get(questions[index].wordId) : undefined;

  if (total === 0) {
    return <Text color="textSecondary">{t('practice.needWords')}</Text>;
  }

  const playAgain = () => {
    setIndex(0);
    setSelectedId(null);
    setCorrect(0);
    setSavedResult(null);
    setSaveFailed(false);
    setPhase('playing');
    setQuestions(buildMatchSession(words, source, random));
  };

  if (phase === 'finished') {
    return (
      <View style={{ gap: spacing.md }}>
        <Text variant="title" accessibilityRole="header" style={{ textAlign: 'center' }}>
          {t('practice.summaryTitle')}
        </Text>
        <Text style={{ textAlign: 'center' }}>
          {t('practice.summaryScore', { correct: result.correct, total: result.total })}
        </Text>
        <Button title={t('common.retry')} variant="secondary" onPress={playAgain} />
        {onExit ? <Button title={t('common.continue')} icon="arrow-forward-outline" iconDirectional onPress={onExit} /> : null}
      </View>
    );
  }

  if (!currentWord) return null;

  const question = questions[index];
  const answered = selectedId !== null;
  const wasCorrect = selectedId === question.wordId;
  const isLast = index === total - 1;

  const label = (id: string) => {
    const word = byId.get(id);
    return word ? meaningOf(word, source) : '';
  };

  const stateOf = (id: string): OptionState => {
    if (!answered) return 'idle';
    if (id === question.wordId) return 'correct';
    return id === selectedId ? 'wrong' : 'dimmed';
  };

  const onSelect = (id: string) => {
    if (answered) return;
    setSelectedId(id);
    if (id === question.wordId) setCorrect((n) => n + 1);
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
    setSelectedId(null);
    setIndex((i) => i + 1);
  };

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ gap: spacing.xs }}>
        <ProgressBar
          value={index / total}
          accessibilityLabel={t('lesson.questionOf', { current: index + 1, total })}
        />
        <Text variant="caption" color="textSecondary">
          {t('lesson.questionOf', { current: index + 1, total })}
        </Text>
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text color="textSecondary">{t('lesson.questionMeaning')}</Text>
        <Text variant="display" accessibilityRole="header">
          {isolateTerm(currentWord)}
        </Text>
      </View>

      <View style={{ gap: spacing.sm }}>
        {question.optionIds.map((id) => (
          <OptionButton
            key={id}
            text={label(id)}
            accessibilityLabel={t('lesson.option', { text: label(id) })}
            state={stateOf(id)}
            disabled={answered}
            onPress={() => onSelect(id)}
          />
        ))}
      </View>

      {answered ? (
        <View style={{ gap: spacing.sm }} accessibilityLiveRegion="polite">
          <Text variant="bodyStrong" color={wasCorrect ? 'success' : 'error'}>
            {t(wasCorrect ? 'lesson.correct' : 'lesson.incorrect')}
          </Text>
          {!wasCorrect ? (
            <Text color="textSecondary">{t('lesson.correctAnswerWas', { answer: meaningOf(currentWord, source) })}</Text>
          ) : null}
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
