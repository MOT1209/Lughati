import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Bubble } from '@/components/ai/Bubble';
import { ChatScreen } from '@/components/ai/ChatScreen';
import { Button, Input, Text } from '@/components/ui';
import { useAiAction } from '@/hooks/useAiAction';
import { useAiContext } from '@/hooks/useAiContext';
import { useTheme } from '@/hooks/useTheme';
import { askTutor } from '@/services/ai';

interface Turn {
  role: 'user' | 'assistant';
  text: string;
  cached?: boolean;
}

export default function AiTutor() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const [topic, setTopic] = useState('');
  const { context, level } = useAiContext(topic.trim() ? `Topic: ${topic.trim().slice(0, 80)}` : undefined);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const action = useAiAction(async (message: string) => {
    if (!context) throw new Error('no profile');
    return askTutor(context, message, conversationId);
  });

  const send = async (message: string) => {
    setPending(message);
    const reply = await action.run(message);
    if (!reply) return false;
    setPending(null);
    setConversationId(reply.conversationId);
    setTurns((prev) => [...prev, { role: 'user', text: message }, { role: 'assistant', text: reply.text, cached: reply.source === 'cache' }]);
    return true;
  };
  const retry = async () => {
    if (pending) await send(pending);
  };

  if (!context) return <Text style={{ padding: spacing.lg }}>{t('ai.noProfile')}</Text>;
  return (
    <ChatScreen
      inputLabel={t('ai.tutor.input')}
      loading={action.loading}
      error={action.state.status === 'error' ? action.state.code : null}
      onRetry={retry}
      onSend={send}
      header={
        <View style={{ gap: spacing.sm }}>
          <Text variant="small" color="textSecondary">
            {t('ai.level', { level })} · {t('ai.tutor.hint')}
          </Text>
          <Input label={t('ai.common.topic')} value={topic} onChangeText={setTopic} maxLength={80} />
        </View>
      }
      thread={turns.map((turn, i) => (
        <Bubble key={i} role={turn.role} who={turn.role === 'user' ? t('ai.common.you') : turn.cached ? `${t('ai.common.tutor')} · ${t('ai.common.cached')}` : t('ai.common.tutor')}>
          {turn.text}
        </Bubble>
      ))}
      footer={
        turns.length > 0 ? (
          <Button
            title={t('ai.common.newConversation')}
            variant="secondary"
            onPress={() => {
              setTurns([]);
              setConversationId(null);
              setPending(null);
              action.reset();
            }}
          />
        ) : null
      }
    />
  );
}
