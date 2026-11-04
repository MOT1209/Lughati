import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, Input, Screen, Text } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import type { AIErrorCode } from '@/services/ai';

import { AiError } from './AiError';

/** Shared shell of the two conversation features: header slot, thread slot, input + send + retry. */
export function ChatScreen(props: {
  header?: React.ReactNode;
  thread: React.ReactNode;
  inputLabel: string;
  loading: boolean;
  error: AIErrorCode | null;
  onRetry: () => void;
  onSend: (text: string) => Promise<boolean>;
  footer?: React.ReactNode;
}) {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const [text, setText] = useState('');
  const send = async () => {
    const value = text.trim();
    if (!value || props.loading) return;
    if (await props.onSend(value)) setText('');
  };
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen edges={['bottom']}>
        {props.header}
        <View style={{ gap: spacing.sm }}>{props.thread}</View>
        {props.error ? <AiError code={props.error} onRetry={props.onRetry} /> : null}
        <View style={{ gap: spacing.md }}>
          <Input label={props.inputLabel} value={text} onChangeText={setText} multiline maxLength={800} textAlignVertical="top" />
          <Button title={t('ai.common.send')} icon="send-outline" onPress={send} loading={props.loading} disabled={text.trim().length === 0} />
          {props.footer}
          <Text variant="caption" color="textSecondary">
            {t('ai.disclaimer')}
          </Text>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
