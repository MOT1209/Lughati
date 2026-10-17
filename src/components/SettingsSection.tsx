import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card, Icon, Text, type IconName } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';

interface SettingsSectionProps {
  icon: IconName;
  title: string;
  children: ReactNode;
}

/** A settings group: icon tile + heading, then its controls. */
export function SettingsSection({ icon, title, children }: SettingsSectionProps) {
  const { colors, spacing, radius } = useTheme();
  return (
    <Card style={{ gap: spacing.md }}>
      <View style={[styles.head, { gap: spacing.md }]}>
        <View style={[styles.tile, { backgroundColor: colors.primaryMuted, borderRadius: radius.md }]}>
          <Icon name={icon} size={20} color="onPrimaryMuted" />
        </View>
        <Text variant="subheading" accessibilityRole="header">
          {title}
        </Text>
      </View>
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center' },
  tile: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
});
