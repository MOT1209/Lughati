import { router } from 'expo-router';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { HeroProgress } from '@/components/HeroProgress';
import { LessonRow } from '@/components/LessonRow';
import { ScreenHero } from '@/components/ScreenHero';
import { EmptyState, ErrorState, LoadingState, Screen, Text } from '@/components/ui';
import { useLessonList } from '@/hooks/useLessonList';
import { useTheme } from '@/hooks/useTheme';
import { useUiLocale } from '@/hooks/useUiLocale';
import { localize } from '@/utils/localize';

export default function Learn() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
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

  const { language, lessons, progress, levels } = list.data;
  const completed = progress?.completedLessonIds ?? [];
  // The hero counts the learner's current level, like the level progress bar under it; once past
  // the last level with lessons, it counts the whole course.
  const atLevel = lessons.filter((lesson) => lesson.levelId === progress?.levelId);
  const counted = atLevel.length > 0 ? atLevel : lessons;
  const doneCount = counted.filter((lesson) => completed.includes(lesson.id)).length;
  // One section per level that has lessons, in course order.
  const sections = levels
    .map((level) => ({ level, lessons: lessons.filter((lesson) => lesson.levelId === level.id) }))
    .filter((section) => section.lessons.length > 0);
  const levelProgress = progress?.levelProgress ?? 0;
  const percent = Math.round(Math.min(1, Math.max(0, Number.isFinite(levelProgress) ? levelProgress : 0)) * 100);

  return (
    <Screen edges={[]} contentStyle={{ padding: 0, gap: 0 }}>
      <ScreenHero
        eyebrow={t('tabs.learn')}
        title={t('learn.subtitle', { language: language ? localize(language.name, locale) : '' })}
        trailing={
          <View accessible accessibilityLabel={t('learn.progressCount', { done: doneCount, total: counted.length })}>
            <Text variant="title" color="heroGold">
              {t('learn.progressCount', { done: doneCount, total: counted.length })}
            </Text>
          </View>
        }
      >
        <HeroProgress value={levelProgress} accessibilityLabel={t('home.overallProgress')} />
        <Text variant="caption" color="onHeroMuted">
          {t('learn.levelProgress', { percent, level: progress?.levelId ?? '' })}
        </Text>
      </ScreenHero>

      {lessons.length === 0 ? (
        <EmptyState icon="book-outline" title={t('learn.title')} message={t('learn.noLessons')} />
      ) : (
        <View style={{ padding: spacing.lg, gap: spacing.lg }}>
          {sections.map((section) => (
            <View key={section.level.id} style={{ gap: spacing.sm }}>
              <Text variant="subheading" accessibilityRole="header">
                {t('learn.levelSection', { level: section.level.id, title: localize(section.level.title, locale) })}
              </Text>
              {section.lessons.map((lesson, index) => (
                <LessonRow
                  key={lesson.id}
                  index={index + 1}
                  title={localize(lesson.title, locale)}
                  summary={localize(lesson.summary, locale)}
                  level={lesson.levelId}
                  minutes={lesson.estimatedMinutes}
                  state={completed.includes(lesson.id) ? 'done' : progress?.currentLessonId === lesson.id ? 'current' : 'todo'}
                  onPress={() => router.push({ pathname: '/lesson/[id]', params: { id: lesson.id } })}
                />
              ))}
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}
