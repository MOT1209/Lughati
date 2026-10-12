import { View } from 'react-native';

import { Icon, Text, type IconName } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';

interface StatTileProps {
  icon: IconName;
  value: string;
  label: string;
}

export function StatTile({ icon, value, label }: StatTileProps) {
  const { colors, radius, spacing } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}`}
      style={{
        flexGrow: 1,
        flexBasis: '45%',
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radius.lg,
        padding: spacing.lg,
        gap: spacing.xs,
      }}
    >
      <Icon name={icon} color="primary" />
      <Text variant="title">{value}</Text>
      <Text variant="small" color="textSecondary">
        {label}
      </Text>
    </View>
  );
}
