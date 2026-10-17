import { I18nManager, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTranslation } from 'react-i18next';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';

const SIZE = 56;
const STROKE = 7;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface GoalRingProps {
  minutesToday: number;
  goalMinutes: number;
}

/** Daily goal on the hero: a ring that fills clockwise from the top (mirrored in RTL), plus the numbers. */
export function GoalRing({ minutesToday, goalMinutes }: GoalRingProps) {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const raw = goalMinutes > 0 ? minutesToday / goalMinutes : 0;
  const ratio = Number.isFinite(raw) ? Math.min(1, Math.max(0, raw)) : 0;
  const percent = Math.round(ratio * 100);
  const reached = goalMinutes > 0 && minutesToday >= goalMinutes;

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
        style={{ transform: [{ rotate: '-90deg' }, ...(I18nManager.isRTL ? [{ scaleY: -1 }] : [])] }}
      >
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} stroke={colors.onHero} strokeOpacity={0.18} strokeWidth={STROKE} fill="none" />
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={colors.heroGold}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          strokeDashoffset={CIRCUMFERENCE * (1 - ratio)}
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
