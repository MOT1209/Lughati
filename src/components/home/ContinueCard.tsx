import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ProgressBar } from '@/components/ProgressBar';
import { Button, Text } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';

interface ContinueCardProps {
  /** Null when there is no lesson in progress (all available lessons done). */
  lesson: { title: string; meta: string; position: string | null; levelProgress: number } | null;
  onContinue: () => void;
}

/** The one thing Home asks the learner to do next; raised over the hero. */
export function ContinueCard({ lesson, onContinue }: ContinueCardProps) {
  const { t } = useTranslation();
  const { colors, spacing, radius, shadows } = useTheme();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl, padding: spacing.lg, gap: spacing.xs },
        shadows.raised,
      ]}
    >
      {lesson ? (
        <>
          <Text variant="caption" color="primary" style={styles.eyebrow}>
            {t('home.continueLearning')}
          </Text>
          <Text variant="heading">{lesson.title}</Text>
          <Text variant="small" color="textSecondary">
            {lesson.meta}
          </Text>
          {lesson.position ? (
            <Text variant="caption" color="textSecondary">
              {lesson.position}
            </Text>
          ) : null}
          <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
            <ProgressBar value={lesson.levelProgress} accessibilityLabel={t('home.overallProgress')} />
            <Text variant="caption" color="textSecondary">
              {t('home.overallProgressValue', { percent: Math.round(Math.min(1, Math.max(0, lesson.levelProgress || 0)) * 100) })}
            </Text>
          </View>
          <Button
            title={t('home.continueLearning')}
            variant="gold"
            icon="play"
            iconDirectional
            onPress={onContinue}
            style={{ marginTop: spacing.md, borderRadius: radius.lg }}
          />
        </>
      ) : (
        <>
          <Text variant="subheading">{t('home.noCurrentLesson')}</Text>
          <Text variant="small" color="textSecondary">
            {t('home.noCurrentLessonBody')}
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1 },
  eyebrow: { letterSpacing: 0.3 },
});
