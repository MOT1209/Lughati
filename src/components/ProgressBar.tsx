import { View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';

interface ProgressBarProps {
  /** 0..1 */
  value: number;
  accessibilityLabel: string;
}

export function ProgressBar({ value, accessibilityLabel }: ProgressBarProps) {
  const { colors, radius } = useTheme();
  // Guard against NaN, null, or undefined values
  const safeValue = Number(value);
  const hasValidNumber = !isNaN(safeValue) && isFinite(safeValue);
  const clamped = Math.min(1, Math.max(0, hasValidNumber ? safeValue : 0));
  const percent = Math.round(clamped * 100);

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: percent }}
      style={{ height: 10, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted, overflow: 'hidden' }}
    >
      {/* width is a percentage, so the bar fills from the start edge in both LTR and RTL */}
      {hasValidNumber ? (
        <View style={{ width: `${percent}%`, height: '100%', backgroundColor: colors.primary }} />
      ) : (
        <View style={{ width: '0%', height: '100%', backgroundColor: colors.primary }} />
      )}
    </View>
  );
}
