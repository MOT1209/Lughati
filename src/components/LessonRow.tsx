import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Icon, Text } from '@/components/ui';
import { MIN_TOUCH_TARGET } from '@/constants/app';
import { useTheme } from '@/hooks/useTheme';
import { fontFamilies } from '@/theme/typography';

export type LessonState = 'done' | 'current' | 'todo';

interface LessonRowProps {
  /** 1-based position in the course; shown inside the marker of a lesson not started yet. */
  index: number;
  title: string;
  summary: string;
  level: string;
  minutes: number;
  state: LessonState;
  onPress: () => void;
}

/** One lesson on the course path: a state marker (check, play, number), its text and a status badge. */
export function LessonRow({ index, title, summary, level, minutes, state, onPress }: LessonRowProps) {
  const { t } = useTranslation();
  const { colors, spacing, radius, shadows } = useTheme();
  const status = t(state === 'done' ? 'learn.statusDone' : state === 'current' ? 'learn.statusCurrent' : 'learn.statusTodo');
  const current = state === 'current';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('learn.lessonLabel', { title, status })}
      style={({ pressed }) => [
        styles.row,
        {
          gap: spacing.md,
          minHeight: MIN_TOUCH_TARGET,
          padding: spacing.md,
          borderRadius: radius.lg,
          backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
          borderColor: current ? colors.primary : colors.border,
          borderWidth: current ? 2 : 1,
        },
        current ? shadows.card : null,
      ]}
    >
      <View
        style={[
          styles.marker,
          { backgroundColor: current ? colors.gold : colors.primaryMuted },
        ]}
      >
        {state === 'done' ? (
          <Icon name="checkmark" size={20} color="success" />
        ) : current ? (
          <Icon name="play" size={18} color="onGold" directional />
        ) : (
          <Text variant="bodyStrong" color="onPrimaryMuted">
            {index}
          </Text>
        )}
      </View>
      <View style={styles.flex}>
        <Text variant="bodyStrong">{title}</Text>
        <Text variant="small" color="textSecondary">
          {summary}
        </Text>
        <Text variant="caption" color="textSecondary">
          {t('home.lessonMeta', { level, count: minutes })}
        </Text>
      </View>
      {state !== 'todo' ? (
        <View style={[styles.badge, { backgroundColor: current ? colors.gold : colors.primaryMuted, borderRadius: radius.pill, paddingHorizontal: spacing.sm }]}>
          <Text variant="caption" color={current ? 'onGold' : 'onPrimaryMuted'} style={styles.badgeText}>
            {t(current ? 'learn.badgeCurrent' : 'learn.statusDone')}
          </Text>
        </View>
      ) : null}
      <Icon name="chevron-forward" size={18} color="textSecondary" directional />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  marker: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  badge: { minHeight: 22, justifyContent: 'center' },
  badgeText: { fontFamily: fontFamilies.bold },
});
