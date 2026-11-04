import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, Text } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import type { AIErrorCode } from '@/services/ai';

/** A clear message for an AI failure, plus a retry action. Never shows provider details. */
export function AiError({ code, onRetry }: { code: AIErrorCode; onRetry?: () => void }) {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.sm }} accessibilityLiveRegion="polite">
      <Text color="error">{t(`ai.errors.${code}`)}</Text>
      {onRetry ? <Button title={t('ai.retry')} variant="secondary" icon="refresh-outline" onPress={onRetry} /> : null}
    </View>
  );
}
