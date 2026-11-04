import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Bubble } from '@/components/ai/Bubble';
import { ChatScreen } from '@/components/ai/ChatScreen';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Button, Card, Text } from '@/components/ui';
import { useAiAction } from '@/hooks/useAiAction';
import { useAiContext } from '@/hooks/useAiContext';
import { useTheme } from '@/hooks/useTheme';
import { sendSpeakingTurn, type SpeakingMode, type SpeakingReply } from '@/services/ai';
import { getSpeechService } from '@/services/speech';
import { useLearningStore } from '@/store/learningStore';
import { isolate } from '@/utils/bidi';

const SCENARIOS = ['intro', 'shopping', 'school', 'travel', 'restaurant'] as const;
const SCENARIO_PROMPT: Record<(typeof SCENARIOS)[number], string> = {
  intro: 'Meeting someone new and introducing yourselves',
  shopping: 'Shopping in a store',
  school: 'Talking at school',
  travel: 'Travelling: station, airport or hotel',
  restaurant: 'Ordering in a restaurant',
};

interface Turn {
  role: 'user' | 'assistant';
  text: string;
  reply?: SpeakingReply;
}

export default function AiSpeaking() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const { context } = useAiContext();
  const target = useLearningStore((s) => s.profile?.target);
  const [scenario, setScenario] = useState<(typeof SCENARIOS)[number]>('intro');
  const [mode, setMode] = useState<SpeakingMode>('beginner');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const action = useAiAction(async (message: string) => {
    if (!context) throw new Error('no profile');
    return sendSpeakingTurn(context, message, SCENARIO_PROMPT[scenario], mode, conversationId);
  });

  const send = async (message: string) => {
    setPending(message);
    const reply = await action.run(message);
    if (!reply) return false;
    setPending(null);
    setConversationId(reply.conversationId);
    setTurns((prev) => [...prev, { role: 'user', text: message }, { role: 'assistant', text: reply.reply, reply }]);
    return true;
  };

  if (!context || !target) return <Text style={{ padding: spacing.lg }}>{t('ai.noProfile')}</Text>;
  const restart = () => {
    setTurns([]);
    setConversationId(null);
    setPending(null);
    action.reset();
  };
  return (
    <ChatScreen
      inputLabel={t('ai.speaking.input')}
      loading={action.loading}
      error={action.state.status === 'error' ? action.state.code : null}
      onRetry={() => (pending ? void send(pending) : undefined)}
      onSend={send}
      header={
        <View style={{ gap: spacing.md }}>
          <Text variant="small" color="textSecondary">
            {t('ai.speaking.micNote')}
          </Text>
          <Text variant="small" color="textSecondary">
            {t('ai.speaking.scenario')}
          </Text>
          <SegmentedControl
            accessibilityLabel={t('ai.speaking.scenario')}
            value={scenario}
            onChange={(next) => {
              setScenario(next);
              restart();
            }}
            options={SCENARIOS.map((s) => ({ value: s, label: t(`ai.speaking.scenarios.${s}`) }))}
          />
          <SegmentedControl
            accessibilityLabel={t('ai.speaking.mode')}
            value={mode}
            onChange={setMode}
            options={(['beginner', 'normal', 'guided'] as const).map((m) => ({ value: m, label: t(`ai.speaking.modes.${m}`) }))}
          />
        </View>
      }
      thread={turns.map((turn, i) => (
        <Bubble
          key={i}
          role={turn.role}
          who={turn.role === 'user' ? t('ai.common.you') : t('ai.common.partner')}
          extra={
            turn.reply ? (
              <View style={{ gap: spacing.sm }}>
                <Button title={t('ai.common.listen')} variant="secondary" icon="volume-high-outline" onPress={() => getSpeechService().speak(turn.reply!.reply, target)} />
                {turn.reply.correction ? (
                  <Card>
                    <Text variant="bodyStrong">{t('ai.speaking.correction')}</Text>
                    <Text>{isolate(`${turn.reply.correction.original} → ${turn.reply.correction.corrected}`)}</Text>
                    <Text variant="small" color="textSecondary">
                      {turn.reply.correction.explanation}
                    </Text>
                  </Card>
                ) : null}
                {turn.reply.vocabulary.length > 0 ? (
                  <View>
                    <Text variant="bodyStrong">{t('ai.speaking.vocabulary')}</Text>
                    {turn.reply.vocabulary.map((v) => (
                      <Text key={v.term} variant="small">
                        {isolate(`${v.term} — ${v.meaning}`)}
                      </Text>
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null
          }
        >
          {turn.text}
        </Bubble>
      ))}
      footer={turns.length > 0 ? <Button title={t('ai.common.newConversation')} variant="secondary" onPress={restart} /> : null}
    />
  );
}
