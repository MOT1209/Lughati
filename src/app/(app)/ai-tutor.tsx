import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { SegmentedControl } from '@/components/SegmentedControl';
import { Button, Card, Input, Screen, Text } from '@/components/ui';
import { useCurrentLearning } from '@/hooks/useCurrentLearning';
import { useTheme } from '@/hooks/useTheme';
import { AIError, getAIProvider, type AIHistoryItem, type AIMode } from '@/services/ai';
import { useLearningStore } from '@/store/learningStore';
import { isolate } from '@/utils/bidi';

type Mode = Extract<AIMode, 'chat' | 'grammar' | 'correct' | 'translate'>;
interface Turn {
  role: 'user' | 'assistant';
  text: string;
  demo?: boolean;
}

export default function AiTutor() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const profile = useLearningStore((s) => s.profile);
  const learning = useCurrentLearning();
  const [mode, setMode] = useState<Mode>('chat');
  const [text, setText] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const level = learning.status === 'success' ? learning.data.progress?.levelId ?? 'A1' : 'A1';

  const ask = async () => {
    if (!profile || loading) return;
    const message = text.trim();
    if (!message) return;
    setError(null);
    setLoading(true);
    const history: AIHistoryItem[] = mode === 'chat' ? turns.map((turn) => ({ role: turn.role, content: turn.text })) : [];
    try {
      const result = await getAIProvider().ask({ mode, message, targetLanguage: profile.target, explanationLanguage: profile.source, level, history });
      setTurns((prev) => [...(mode === 'chat' ? prev : []), { role: 'user', text: message }, { role: 'assistant', text: result.text, demo: result.source === 'mock' }]);
      setText('');
    } catch (e) {
      setError(t(`ai.errors.${e instanceof AIError ? e.code : 'unknown'}`));
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen edges={['bottom']}>
        <SegmentedControl<Mode>
          accessibilityLabel={t('ai.mode')}
          value={mode}
          onChange={(next) => {
            setMode(next);
            setTurns([]);
            setError(null);
          }}
          options={[
            { value: 'chat', label: t('ai.modes.chat') },
            { value: 'grammar', label: t('ai.modes.grammar') },
            { value: 'correct', label: t('ai.modes.correct') },
            { value: 'translate', label: t('ai.modes.translate') },
          ]}
        />
        <Text variant="small" color="textSecondary">
          {t(`ai.hints.${mode}`)}
        </Text>

        {turns.map((turn, index) => (
          <Card key={index}>
            <Text variant="caption" color="textSecondary">
              {turn.role === 'user' ? t('ai.you') : turn.demo ? t('ai.demoTutor') : t('ai.tutor')}
            </Text>
            <Text>{isolate(turn.text)}</Text>
          </Card>
        ))}

        <View style={{ gap: spacing.md }}>
          <Input label={t('ai.inputLabel')} value={text} onChangeText={setText} multiline maxLength={800} textAlignVertical="top" />
          {error ? (
            <Text color="error" accessibilityLiveRegion="polite">
              {error}
            </Text>
          ) : null}
          <Button title={t('ai.ask')} icon="sparkles-outline" onPress={ask} loading={loading} disabled={text.trim().length === 0} />
          <Text variant="caption" color="textSecondary">
            {t('ai.disclaimer')}
          </Text>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
