import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { LanguageBadge } from '@/components/LanguageBadge';
import { ProgressBar } from '@/components/ProgressBar';
import { Button, Card, ErrorState, Icon, LoadingState, Screen, Text, type IconName } from '@/components/ui';
import { useCurrentLearning } from '@/hooks/useCurrentLearning';
import { useTheme } from '@/hooks/useTheme';
import { useUiLocale } from '@/hooks/useUiLocale';
import { isolate, isolateNative } from '@/utils/bidi';
import { localize } from '@/utils/localize';
import { ROUTES } from '@/utils/routing';

const quickActions: { icon: IconName; label: 'home.qaVocabulary' | 'home.qaPractice' | 'home.qaChat' }[] = [
  { icon: 'text-outline', label: 'home.qaVocabulary' },
  { icon: 'barbell-outline', label: 'home.qaPractice' },
  { icon: 'chatbubbles-outline', label: 'home.qaChat' },
];

export default function Home() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
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

  const { language, level, progress, plan, lesson, streak } = learning.data;
  const goalRatio = plan.dailyGoalMinutes > 0 ? plan.minutesToday / plan.dailyGoalMinutes : 0;
  const goalReached = plan.minutesToday >= plan.dailyGoalMinutes;

  return (
    <Screen edges={['top']}>
      <Text variant="title" accessibilityRole="header">
        {t('home.greeting', { name: isolate(learning.user?.name ?? '') })}
      </Text>

      <Card style={{ gap: spacing.md }}>
        <Text variant="small" color="textSecondary">
          {t('home.currentLanguage')}
        </Text>
        <View style={[styles.row, { gap: spacing.md }]}>
          {language ? <LanguageBadge code={language.code} /> : null}
          <View style={styles.flex}>
            <Text variant="heading">{language ? localize(language.name, locale) : ''}</Text>
            {language && language.nativeName !== localize(language.name, locale) ? (
              <Text variant="small" color="textSecondary">
                {isolateNative(language.nativeName, language.direction)}
              </Text>
            ) : null}
          </View>
          {level ? (
            <View accessible accessibilityLabel={`${t('home.level')}: ${localize(level.title, locale)}`}>
              <Text variant="bodyStrong" color="primary">
                {level.id}
              </Text>
              <Text variant="caption" color="textSecondary">
                {localize(level.title, locale)}
              </Text>
            </View>
          ) : null}
        </View>
        <Button title={t('home.changeLanguage')} variant="secondary" icon="swap-horizontal-outline" onPress={() => router.push(ROUTES.languageSelection)} />
      </Card>

      <Card style={{ gap: spacing.sm }}>
        <Text variant="subheading">{t('home.dailyGoal')}</Text>
        <ProgressBar value={goalRatio} accessibilityLabel={t('home.dailyGoal')} />
        <Text variant="small" color="textSecondary">
          {goalReached ? t('home.dailyGoalDone') : t('home.dailyGoalProgress', { done: plan.minutesToday, goal: plan.dailyGoalMinutes })}
        </Text>
      </Card>

      {lesson && progress ? (
        <Card style={{ gap: spacing.sm }}>
          <Text variant="subheading">{t('home.continueLearning')}</Text>
          <Text variant="heading">{localize(lesson.title, locale)}</Text>
          <Text variant="small" color="textSecondary">
            {t('home.lessonMeta', { level: lesson.levelId, minutes: lesson.estimatedMinutes })}
          </Text>
          <ProgressBar value={progress.levelProgress} accessibilityLabel={t('home.overallProgress')} />
          <Button title={t('home.continueLearning')} icon="play-outline" iconDirectional onPress={() => router.push({ pathname: '/lesson/[id]', params: { id: lesson.id } })} />
        </Card>
      ) : (
        // currentLessonId === null means "no current lesson", not an error.
        <Card style={{ gap: spacing.sm }}>
          <Text variant="subheading">{t('home.noCurrentLesson')}</Text>
          <Text variant="small" color="textSecondary">
            {t('home.noCurrentLessonBody')}
          </Text>
        </Card>
      )}

      <Card style={[styles.row, { gap: spacing.md }]}>
        <Icon name="flame" size={32} color="accent" />
        <View style={styles.flex}>
          <Text variant="small" color="textSecondary">
            {t('home.streak')}
          </Text>
          <Text variant="heading">{t('home.streakDays', { count: streak.days })}</Text>
        </View>
      </Card>

      <View style={{ gap: spacing.sm }}>
        <Text variant="subheading">{t('home.quickActions')}</Text>
        {quickActions.map((action) => (
          <Button key={action.label} title={t(action.label)} icon={action.icon} variant="secondary" onPress={() => router.push(ROUTES.learn)} />
        ))}
        <Button title={t('home.qaLanguages')} icon="language-outline" variant="secondary" onPress={() => router.push(ROUTES.languageSelection)} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
});
