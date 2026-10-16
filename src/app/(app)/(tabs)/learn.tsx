import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Card, EmptyState, ErrorState, Icon, LoadingState, Screen, Text } from '@/components/ui';
import { MIN_TOUCH_TARGET } from '@/constants/app';
import { useLessonList } from '@/hooks/useLessonList';
import { useTheme } from '@/hooks/useTheme';
import { useUiLocale } from '@/hooks/useUiLocale';
import { localize } from '@/utils/localize';

export default function Learn() {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const { locale } = useUiLocale();
  const list = useLessonList();

  if (list.status === 'loading') {
    return (
      <Screen edges={['top']}>
        <LoadingState />
      </Screen>
    );
  }
  if (list.status === 'error') {
    return (
      <Screen edges={['top']}>
        <ErrorState error={list.error} onRetry={list.reload} />
      </Screen>
    );
  }

  const { language, lessons, progress } = list.data;

  return (
    <Screen edges={['top']}>
      <Text variant="title" accessibilityRole="header">
        {t('learn.subtitle', { language: language ? localize(language.name, locale) : '' })}
      </Text>

      {lessons.length === 0 ? (
        <EmptyState icon="book-outline" title={t('learn.title')} message={t('learn.noLessons')} />
      ) : (
        <View style={{ gap: spacing.md }}>
          {lessons.map((lesson) => {
            const done = progress?.completedLessonIds.includes(lesson.id) ?? false;
            const current = progress?.currentLessonId === lesson.id;
            const status = t(done ? 'learn.statusDone' : current ? 'learn.statusCurrent' : 'learn.statusTodo');
            const title = localize(lesson.title, locale);
            return (
              <Pressable
                key={lesson.id}
                onPress={() => router.push({ pathname: '/lesson/[id]', params: { id: lesson.id } })}
                accessibilityRole="button"
                accessibilityLabel={t('learn.lessonLabel', { title, status })}
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              >
                <Card style={[styles.row, { gap: spacing.md, minHeight: MIN_TOUCH_TARGET, borderColor: current ? colors.primary : colors.border }]}>
                  <Icon name={done ? 'checkmark-circle' : current ? 'play-circle-outline' : 'ellipse-outline'} size={28} color={done ? 'success' : 'primary'} />
                  <View style={styles.flex}>
                    <Text variant="bodyStrong">{title}</Text>
                    <Text variant="small" color="textSecondary">
                      {localize(lesson.summary, locale)}
                    </Text>
                    <Text variant="caption" color="textSecondary">
                      {t('learn.lessonMeta', { level: lesson.levelId, count: lesson.estimatedMinutes, status })}
                    </Text>
                  </View>
                  <Icon name="chevron-forward" directional color="textSecondary" />
                </Card>
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
});