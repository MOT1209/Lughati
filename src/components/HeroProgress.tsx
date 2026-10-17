import { View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';

interface HeroProgressProps {
  /** 0..1 */
  value: number;
  accessibilityLabel: string;
}

/** Progress bar for the dark hero (gold on a translucent track). Fills from the start edge in LTR and RTL. */
export function HeroProgress({ value, accessibilityLabel }: HeroProgressProps) {
  const { colors, radius } = useTheme();
  const safe = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
  const percent = Math.round(safe * 100);

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: percent }}
      style={{ height: 8, borderRadius: radius.pill, backgroundColor: colors.heroOverlayStrong, overflow: 'hidden' }}
    >
      <View style={{ width: `${percent}%`, height: '100%', borderRadius: radius.pill, backgroundColor: colors.heroGold }} />
    </View>
  );
}
