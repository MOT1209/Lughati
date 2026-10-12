import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { EmptyState, ErrorState, Icon, LoadingState, Screen, Text } from '@/components/ui';
import { MIN_TOUCH_TARGET } from '@/constants/app';
import { useCurrentLearning } from '@/hooks/useCurrentLearning';
import { useTheme } from '@/hooks/useTheme';
import { useUiLocale } from '@/hooks/useUiLocale';
import { localize } from '@/utils/localize';
import { openLesson } from '@/utils/routing';

export default function Learn() {
  const { t } = useTranslation();
  const { colors, radius, spacing } = useTheme();
  const { locale } = useUiLocale();
  const learning = useCurrentLearning();

  if (learning.status === 'loading') {
    return (
      <Screen edges={['top']}>
        <LoadingState />
      </Screen>
    );
  }
  if (learning.status === 'error') {
    return (
      <Screen edges={['top']}>
        <ErrorState onRetry={learning.reload} />
      </Screen>
    );
  }

  const { lessons, progress, lesson: current } = learning.data;
  if (lessons.length === 0) {
    return (
      <Screen edges={['top']} contentStyle={{ justifyContent: 'center' }}>
        <EmptyState icon="book-outline" title={t('learn.emptyTitle')} message={t('learn.emptyMessage')} />
      </Screen>
    );
  }

  return (
    <Screen edges={['top']}>
      <Text variant="title" accessibilityRole="header">
        {t('learn.lessonsOf')}
      </Text>
      <View style={{ gap: spacing.sm }}>
        {lessons.map((lesson) => {
          const done = progress?.completedLessonIds.includes(lesson.id) ?? false;
          const isCurrent = lesson.id === current?.id;
          const title = localize(lesson.title, locale);
          const status = done ? t('learn.statusDone') : isCurrent ? t('learn.statusCurrent') : t('learn.statusOpen');
          return (
            <Pressable
              key={lesson.id}
              onPress={() => openLesson(router, lesson.id)}
              accessibilityRole="button"
              accessibilityLabel={`${t('learn.openLesson', { title })}. ${status}`}
              style={[
                styles.row,
                {
                  minHeight: MIN_TOUCH_TARGET + 16,
                  gap: spacing.md,
                  padding: spacing.md,
                  borderRadius: radius.lg,
                  borderWidth: isCurrent ? 2 : 1,
                  borderColor: isCurrent ? colors.primary : colors.border,
                  backgroundColor: colors.surface,
                },
              ]}
            >
              <Icon name={done ? 'checkmark-circle' : 'ellipse-outline'} color={done ? 'success' : 'textSecondary'} />
              <View style={styles.flex}>
                <Text variant="bodyStrong">{title}</Text>
                <Text variant="small" color="textSecondary">
                  {`${lesson.levelId} · ${t('learn.minutes', { minutes: lesson.estimatedMinutes })} · ${status}`}
                </Text>
              </View>
              <Icon name="chevron-forward" directional color="textSecondary" />
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
});
