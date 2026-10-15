import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { OptionButton, type OptionState } from '@/components/OptionButton';
import { Text, Button } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import type { LanguageCode, Vocabulary } from '@/types';
import { isolateTerm, meaningOf } from '@/utils/meaning';

interface VocabularyMatchProps {
  words: Vocabulary[];
  source: LanguageCode | null;
}

export function VocabularyMatchGame({ words, source }: VocabularyMatchProps) {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const byId = new Map(words.map((word) => [word.id, word]));

  const [pairs, setPairs] = useState<{ word: Vocabulary; matched: boolean }[]>(() => {
    const shuffled = [...words];
    return shuffled.map((w) => ({ word: w, matched: false }));
  });
  const [session, setSession] = useState<{
    index: number;
    selectedWordId: string | null;
    correct: number;
    total: number;
  }>({ index: 0, selectedWordId: null, correct: 0, total: words.length });

  const word = pairs[session.index]?.word;
  if (!word) return null;

  const meaning = meaningOf(word, source);
  const otherWords = pairs
    .filter((p) => p.word.id !== word.id && !p.matched)
    .map((p) => p.word.id);

  const options = [
    ...otherWords,
    word.id,
  ].sort(() => Math.random() - 0.5);

  const exercise = options.map((id) => ({
    id,
    type: 'match' as const,
    subjectId: word.id,
    options,
    answer: word.id,
  }))[session.index];

  if (!exercise) return null;

  const selected = session.selectedWordId;
  const wasCorrect = selected === exercise.answer;
  const isLast = session.index === words.length - 1;

  const stateOf = (id: string): OptionState => {
    if (id === exercise.answer && wasCorrect) return 'correct';
    if (id === selected) return 'wrong';
    return 'idle';
  };

  const onSelect = (id: string) => {
    setSession({
      ...session,
      selectedWordId: id,
      correct:
        session.correct + (id === exercise.answer ? 1 : 0),
    });
  };

  const onNext = () => {
    setSession({
      ...session,
      index: session.index + 1,
      selectedWordId: null,
    });
  };

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ gap: spacing.xs }}>
        <Text variant="caption" color="textSecondary">
          {t('lesson.questionOf')} {session.index + 1} {t('lesson.of')} {words.length}
        </Text>
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text color="textSecondary">{t('lesson.matchWord')}</Text>
        <Text variant="display" accessibilityRole="header">
          {isolateTerm(word)}
        </Text>
      </View>

      <View style={{ gap: spacing.sm }}>
        {options.map((id) => (
          <OptionButton
            key={id}
            text={byId.get(id) ? isolateTerm(byId.get(id)!) : ''}
            accessibilityLabel={t('lesson.option')}
            state={stateOf(id)}
            disabled={session.selectedWordId !== null}
            onPress={() => onSelect(id)}
          />
        ))}
      </View>

      {session.selectedWordId !== null ? (
        <View style={{ gap: spacing.sm }} accessibilityLiveRegion="polite">
          <Text variant="bodyStrong" color={wasCorrect ? 'success' : 'error'}>
            {t(wasCorrect ? 'lesson.correct' : 'lesson.incorrect')}
          </Text>
          {!wasCorrect && (
            <Text color="textSecondary">{t('lesson.correctAnswerWas')} {isolateTerm(word)}</Text>
          )}
          {isLast ? null : (
            <Button title={t('lesson.next')} onPress={onNext} />
          )}
          {isLast ? (
            <Button title={t('lesson.finish')} onPress={() => {
              // TODO: finish and save progress
            }} />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}