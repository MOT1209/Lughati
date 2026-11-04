import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AiError } from '@/components/ai/AiError';
import { Button, Card, Input, Screen, Text } from '@/components/ui';
import { useAiAction } from '@/hooks/useAiAction';
import { useAiContext } from '@/hooks/useAiContext';
import { useTheme } from '@/hooks/useTheme';
import { coachPronunciation } from '@/services/ai';
import { getSpeechService } from '@/services/speech';
import { useLearningStore } from '@/store/learningStore';
import { isolate } from '@/utils/bidi';

export default function AiPronunciation() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const { context } = useAiContext();
  const target = useLearningStore((s) => s.profile?.target);
  const [sentence, setSentence] = useState('');
  const [transcript, setTranscript] = useState('');
  const action = useAiAction(async (a: string, b: string) => {
    if (!context) throw new Error('no profile');
    return coachPronunciation(context, a, b);
  });

  if (!context || !target) return <Text style={{ padding: spacing.lg }}>{t('ai.noProfile')}</Text>;
  const r = action.state.status === 'success' ? action.state.data : null;
  const matched = r && r.diff.missing.length === 0 && r.diff.substituted.length === 0 && r.diff.extra.length === 0;
  return (
    <Screen edges={['bottom']}>
      <Input label={t('ai.pronunciation.target')} value={sentence} onChangeText={setSentence} maxLength={300} />
      <Button title={t('ai.pronunciation.listenTarget')} variant="secondary" icon="volume-high-outline" disabled={sentence.trim().length === 0} onPress={() => getSpeechService().speak(sentence.trim(), target)} />
      <Text variant="small" color="textSecondary">
        {t('ai.pronunciation.note')}
      </Text>
      <Input label={t('ai.pronunciation.transcript')} value={transcript} onChangeText={setTranscript} maxLength={300} />
      <Button title={t('ai.pronunciation.check')} icon="git-compare-outline" loading={action.loading} disabled={sentence.trim().length === 0 || transcript.trim().length === 0} onPress={() => void action.run(sentence, transcript)} />
      {action.state.status === 'error' ? <AiError code={action.state.code} onRetry={() => void action.retry()} /> : null}
      {r ? (
        <Card style={{ gap: spacing.sm }} accessibilityLiveRegion="polite">
          {matched ? <Text color="success">{t('ai.pronunciation.allMatched')}</Text> : null}
          {r.diff.missing.length > 0 ? <Text>{isolate(t('ai.pronunciation.missing', { words: r.diff.missing.join(', ') }))}</Text> : null}
          {r.diff.substituted.length > 0 ? <Text>{isolate(t('ai.pronunciation.substituted', { pairs: r.diff.substituted.map((p) => `${p.expected} → ${p.heard}`).join(', ') }))}</Text> : null}
          {r.diff.extra.length > 0 ? <Text>{isolate(t('ai.pronunciation.extra', { words: r.diff.extra.join(', ') }))}</Text> : null}
          {r.tips.length > 0 ? (
            <View>
              <Text variant="bodyStrong">{t('ai.pronunciation.tips')}</Text>
              {r.tips.map((tip, i) => (
                <Text key={i} variant="small">
                  • {tip}
                </Text>
              ))}
            </View>
          ) : null}
          {r.practiceWords.length > 0 ? <Text variant="small">{isolate(t('ai.pronunciation.practiceWords', { words: r.practiceWords.join(', ') }))}</Text> : null}
          {r.adviceUnavailable ? <Text variant="small" color="textSecondary">{t('ai.pronunciation.adviceUnavailable')}</Text> : null}
          <Text variant="caption" color="textSecondary">
            {t('ai.pronunciation.limitation')}
          </Text>
        </Card>
      ) : null}
    </Screen>
  );
}
