import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/hooks/useTheme';

import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export function LoadingState({ message }: { message?: string }) {
  const { colors, spacing } = useTheme();
  const { t } = useTranslation();
  const label = message ?? t('common.loading');
  return (
    <View style={[styles.center, { gap: spacing.md, padding: spacing.xl }]} accessibilityRole="progressbar" accessibilityLabel={label}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text color="textSecondary">{label}</Text>
    </View>
  );
}

interface MessageStateProps {
  icon: IconName;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

function MessageState({ icon, title, message, actionLabel, onAction }: MessageStateProps) {
  const { spacing } = useTheme();
  return (
    <View style={[styles.center, { gap: spacing.md, padding: spacing.xl }]}>
      <Icon name={icon} size={48} color="textSecondary" />
      <Text variant="heading" style={styles.centerText}>
        {title}
      </Text>
      <Text color="textSecondary" style={styles.centerText}>
        {message}
      </Text>
      {actionLabel && onAction ? <Button title={actionLabel} onPress={onAction} variant="secondary" /> : null}
    </View>
  );
}

export function EmptyState(props: Omit<MessageStateProps, 'icon'> & { icon?: IconName }) {
  return <MessageState icon="file-tray-outline" {...props} />;
}

export function ErrorState({ title, message, onRetry }: { title?: string; message?: string; onRetry?: () => void }) {
  const { t } = useTranslation();
  return (
    <MessageState
      icon="alert-circle-outline"
      title={title ?? t('common.errorTitle')}
      message={message ?? t('common.errorMessage')}
      actionLabel={onRetry ? t('common.retry') : undefined}
      onAction={onRetry}
    />
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  centerText: { textAlign: 'center' },
});
