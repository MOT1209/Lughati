import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ProgressBar } from '@/components/ProgressBar';
import { Button, Screen, Text } from '@/components/ui';
import { StatTile } from '@/components/StatTile';
import { useCurrentLearning } from '@/hooks/useCurrentLearning';
import { useTheme } from '@/hooks/useTheme';
import { ROUTES } from '@/utils/routing';

export default function Progress() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const learning = useCurrentLearning();

  if (learning.status === 'loading') {
    return (
      <Screen edges={['top']}>
        <ProgressBar value={0} accessibilityLabel={t('progress.loading')} />
      </Screen>
    );
  }
  if (learning.status === 'error') {
    return (
      <Screen edges={['top']}>
        <Text variant="heading" style={{ textAlign: 'center' }}>
          {t('progress.error')}
        </Text>
      </Screen>
    );
  }

  const { progress, streak } = learning.data;

  return (
    <Screen edges={['top']}>
      <Text variant="title" style={{ textAlign: 'center' }}>
        {t('progress.title')}
      </Text>
      <View style={styles.wrap}>
        <View style={[styles.summary, { borderColor: colors.border }]}>
          <Text variant="heading" style={{ textAlign: 'center' }}>
            {t('progress.xp', { xp: progress?.totalXp ?? 0 })}
          </Text>
          <Text variant="small" style={{ textAlign: 'center' }}>
            {t('progress.words', { words: progress?.wordsLearned ?? 0 })}
          </Text>
          <Text variant="small" style={{ textAlign: 'center' }}>
            {t('progress.minutes', { minutes: progress?.minutesLearned ?? 0 })}
          </Text>
        </View>
        <View style={styles.grid}>
          <StatTile icon="flash-outline" value={String(progress?.totalXp ?? 0)} label={t('progress.statXp')} />
          <StatTile icon="text-outline" value={String(progress?.wordsLearned ?? 0)} label={t('progress.statWords')} />
          <StatTile icon="time-outline" value={String(progress?.minutesLearned ?? 0)} label={t('progress.statMinutes')} />
          <StatTile icon="flame-outline" value={String(streak.days)} label={t('progress.statStreak')} />
        </View>
      </View>
      <View style={{ marginTop: 24, alignItems: 'center' }}>
        <Button title={t('progress.continueLearning')} variant="secondary" onPress={() => router.push(ROUTES.learn)} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 24, padding: 24 },
  summary: { gap: 8, marginBottom: 8, borderRadius: 12, borderWidth: 1, padding: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
});
