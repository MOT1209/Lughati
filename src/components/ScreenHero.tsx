import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';

interface ScreenHeroProps {
  /** Small label above the title (usually the tab name). */
  eyebrow: string;
  title: string;
  /** Right/end side of the title row (a count, a streak chip). */
  trailing?: ReactNode;
  children?: ReactNode;
  /** Extra room at the bottom for a card that overlaps the hero. */
  overlap?: number;
  /** Pad for the status bar. Turn off under a native header, which already covers it. */
  topInset?: boolean;
}

/** The brand header shared by the tab screens: the icon's dark teal gradient with a title row. */
export function ScreenHero({ eyebrow, title, trailing, children, overlap = 0, topInset = true }: ScreenHeroProps) {
  const { colors, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={[colors.heroStart, colors.heroMid, colors.heroEnd]}
      locations={[0, 0.5, 1]}
      start={{ x: 1, y: 0 }}
      end={{ x: 0.2, y: 1 }}
      style={{
        paddingTop: (topInset ? insets.top : 0) + spacing.lg,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.lg + overlap,
        borderBottomLeftRadius: radius.xl,
        borderBottomRightRadius: radius.xl,
        gap: spacing.md,
      }}
    >
      <View style={[styles.row, { gap: spacing.md }]}>
        <View style={styles.flex}>
          <Text variant="caption" color="onHeroMuted" style={styles.eyebrow}>
            {eyebrow}
          </Text>
          <Text variant="title" color="onHero" accessibilityRole="header">
            {title}
          </Text>
        </View>
        {trailing}
      </View>
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  flex: { flex: 1 },
  eyebrow: { letterSpacing: 0.3 },
});
