import { I18nManager, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTranslation } from 'react-i18next';

import { Text } from '@/components/ui';
import { goalRingGeometry, RING_SIZE as SIZE, RING_STROKE as STROKE } from '@/components/home/goalRing';
import { useTheme } from '@/hooks/useTheme';

interface GoalRingProps {
  minutesToday: number;
  goalMinutes: number;
}

/** Daily goal on the hero: a ring that fills clockwise from the top (mirrored in RTL), plus the numbers. */
export function GoalRing({ minutesToday, goalMinutes }: GoalRingProps) {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const { percent, reached, radius, circumference, dashOffset, transform } = goalRingGeometry(minutesToday, goalMinutes, I18nManager.isRTL);

  return (
    <View
      style={[styles.row, { gap: spacing.md }]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t('home.dailyGoal')}
      accessibilityValue={{ min: 0, max: 100, now: percent }}
    >
      <Svg
        width={SIZE}
        height={SIZE}
        style={{ transform }}
      >
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={radius} stroke={colors.onHero} strokeOpacity={0.18} strokeWidth={STROKE} fill="none" />
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={radius}
          stroke={colors.heroGold}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          fill="none"
        />
      </Svg>
      <View style={styles.flex}>
        <Text variant="caption" color="onHeroMuted">
          {t('home.dailyGoal')}
        </Text>
        <Text variant="bodyStrong" color="onHero">
          {reached ? t('home.dailyGoalDone') : t('home.dailyGoalProgress', { done: minutesToday, goal: goalMinutes })}
        </Text>
      </View>
      <Text variant="title" color="heroGold">
        {t('home.goalPercent', { percent })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
});
