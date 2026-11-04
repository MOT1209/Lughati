import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AiError } from '@/components/ai/AiError';
import { Button, Card, Input, Screen, Text } from '@/components/ui';
import { useAiAction } from '@/hooks/useAiAction';
import { useAiContext } from '@/hooks/useAiContext';
import { useTheme } from '@/hooks/useTheme';
import { correctWriting } from '@/services/ai';
import { isolate } from '@/utils/bidi';

export default function AiWriting() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const { context, level } = useAiContext();
  const [text, setText] = useState('');
  const action = useAiAction(async (value: string) => {
    if (!context) throw new Error('no profile');
    return correctWriting(context, value);
  });

  if (!context) return <Text style={{ padding: spacing.lg }}>{t('ai.noProfile')}</Text>;
  const result = action.state.status === 'success' ? action.state.data : null;
  return (
    <Screen edges={['bottom']}>
      <Text variant="small" color="textSecondary">
        {t('ai.level', { level })}
      </Text>
      <Input label={t('ai.writing.input')} value={text} onChangeText={setText} multiline maxLength={1200} textAlignVertical="top" />
      <Button title={t('ai.writing.check')} icon="checkmark-done-outline" onPress={() => void action.run(text)} loading={action.loading} disabled={text.trim().length === 0} />
      {action.state.status === 'error' ? <AiError code={action.state.code} onRetry={() => void action.retry()} /> : null}
      {result ? (
        <View style={{ gap: spacing.md }}>
          <Card>
            <Text variant="bodyStrong">{t('ai.writing.corrected')}</Text>
            <Text>{isolate(result.correctedText)}</Text>
          </Card>
          <Card>
            <Text variant="bodyStrong">{t('ai.writing.corrections')}</Text>
            {result.corrections.length === 0 ? <Text color="textSecondary">{t('ai.writing.none')}</Text> : null}
            {result.corrections.map((c, i) => (
              <View key={i} style={{ marginTop: spacing.sm }}>
                <Text>{isolate(`${c.original} → ${c.corrected}`)}</Text>
                <Text variant="small" color="textSecondary">
                  {c.explanation}
                </Text>
              </View>
            ))}
          </Card>
          <Card>
            <Text variant="bodyStrong">{t('ai.writing.improved')}</Text>
            <Text>{isolate(result.improvedVersion)}</Text>
          </Card>
        </View>
      ) : null}
      <Text variant="caption" color="textSecondary">
        {t('ai.disclaimer')}
      </Text>
    </Screen>
  );
}
