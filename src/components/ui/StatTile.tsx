import { View } from 'react-native';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';
import { useTheme } from '@/hooks/useTheme';

interface StatTileProps {
  icon: IconName;
  value: string;
  label: string;
  accessibilityLabel?: string;
  /** Gold icon tile for the headline figure of a group. */
  highlight?: boolean;
}

export function StatTile({ icon, value, label, accessibilityLabel, highlight = false }: StatTileProps) {
  const { colors, radius, spacing } = useTheme();
  const ariaLabel = accessibilityLabel ?? `${label}: ${value}`;
  return (
    <View
      accessible
      accessibilityLabel={ariaLabel}
      style={{
        flexGrow: 1,
        flexBasis: '45%',
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radius.lg,
        padding: spacing.md,
        gap: spacing.xs,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: radius.md,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: highlight ? colors.gold : colors.primaryMuted,
        }}
      >
        <Icon name={icon} size={20} color={highlight ? 'onGold' : 'onPrimaryMuted'} />
      </View>
      <Text variant="title">{value}</Text>
      <Text variant="small" color="textSecondary">
        {label}
      </Text>
    </View>
  );
}
