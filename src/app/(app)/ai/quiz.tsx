import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AiError } from '@/components/ai/AiError';
import { OptionButton } from '@/components/OptionButton';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Button, Card, Input, Screen, Text } from '@/components/ui';
import { useAiAction } from '@/hooks/useAiAction';
import { useAiContext } from '@/hooks/useAiContext';
import { useTheme } from '@/hooks/useTheme';
import { generateExercises, type ExerciseType, type GeneratedExercise } from '@/services/ai';
import { isCorrectAnswer } from '@/services/ai/quizCheck';
import { isolate } from '@/utils/bidi';

const TYPES = ['multiple_choice', 'fill_blank', 'translation', 'grammar'] as const satisfies readonly ExerciseType[];

export default function AiQuiz() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const { context } = useAiContext();
  const [topic, setTopic] = useState('');
  const [type, setType] = useState<ExerciseType>('multiple_choice');
  const [items, setItems] = useState<GeneratedExercise[] | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [index, setIndex] = useState(0);
  const [response, setResponse] = useState('');
  const [checked, setChecked] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const action = useAiAction(async (value: string, kind: ExerciseType) => {
    if (!context) throw new Error('no profile');
    return generateExercises(context, value, kind, 3);
  });

  const start = async () => {
    const data = await action.run(topic, type);
    if (!data) return;
    setItems(data.exercises);
    setFromCache(data.source === 'cache');
    setIndex(0);
    setScore(0);
    setResponse('');
    setChecked(null);
  };

  if (!context) return <Text style={{ padding: spacing.lg }}>{t('ai.noProfile')}</Text>;
  const current = items?.[index];
  const finished = items !== null && index >= items.length;

  const check = (value: string = response) => {
    if (!current || checked !== null) return;
    setResponse(value);
    const ok = isCorrectAnswer(current, value);
    setChecked(ok);
    if (ok) setScore((s) => s + 1);
  };
  const next = () => {
    setIndex((i) => i + 1);
    setResponse('');
    setChecked(null);
  };

  return (
    <Screen edges={['bottom']}>
      {!items || finished ? (
        <View style={{ gap: spacing.md }}>
          {finished ? (
            <Card>
              <Text variant="bodyStrong" accessibilityLiveRegion="polite">
                {t('ai.quiz.finished', { score, total: items!.length })}
              </Text>
            </Card>
          ) : null}
          <Input label={t('ai.quiz.topic')} value={topic} onChangeText={setTopic} maxLength={80} placeholder={t('ai.quiz.topicHint')} />
          <Text variant="small" color="textSecondary">
            {t('ai.quiz.type')}
          </Text>
          <SegmentedControl accessibilityLabel={t('ai.quiz.type')} value={type} onChange={setType} options={TYPES.map((x) => ({ value: x, label: t(`ai.quiz.types.${x}`) }))} />
          <Button title={finished ? t('ai.quiz.again') : t('ai.quiz.generate')} icon="sparkles-outline" onPress={() => void start()} loading={action.loading} disabled={topic.trim().length === 0} />
          {action.state.status === 'error' ? <AiError code={action.state.code} onRetry={() => void action.retry()} /> : null}
        </View>
      ) : current ? (
        <View style={{ gap: spacing.md }}>
          {fromCache ? (
            <Text variant="caption" color="textSecondary">
              {t('ai.quiz.saved')}
            </Text>
          ) : null}
          <Card>
            <Text>{isolate(current.question)}</Text>
          </Card>
          {current.options ? (
            current.options.map((option) => (
              <OptionButton
                key={option}
                text={isolate(option)}
                accessibilityLabel={option}
                disabled={checked !== null}
                state={checked === null ? 'idle' : option === current.answer ? 'correct' : response === option ? 'wrong' : 'dimmed'}
                onPress={() => check(option)}
              />
            ))
          ) : (
            <Input label={t('ai.quiz.answer')} value={response} onChangeText={setResponse} editable={checked === null} />
          )}
          {checked === null ? (
            current.options ? null : <Button title={t('ai.quiz.check')} onPress={() => check()} disabled={response.trim().length === 0} />
          ) : (
            <View style={{ gap: spacing.sm }} accessibilityLiveRegion="polite">
              <Text color={checked ? 'success' : 'error'} variant="bodyStrong">
                {checked ? t('ai.quiz.correct') : t('ai.quiz.wrong')}
              </Text>
              {!checked ? <Text>{isolate(t('ai.quiz.answerWas', { answer: current.answer }))}</Text> : null}
              <Text variant="small" color="textSecondary">
                {current.explanation}
              </Text>
              <Button title={t('ai.quiz.next')} onPress={next} />
            </View>
          )}
        </View>
      ) : null}
      <Text variant="caption" color="textSecondary">
        {t('ai.disclaimer')}
      </Text>
    </Screen>
  );
}
