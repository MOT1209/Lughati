import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { ProgressBar } from '@/components/ProgressBar';
import { Screen, Text } from '@/components/ui';
import { StatTile } from '@/components/StatTile';
import { useCurrentLearning } from '@/hooks/useCurrentLearning';
import { useTheme } from '@/hooks/useTheme';
import { ROUTES } from '@/utils/routing';

export default function Progress() {
  const { t } = useTranslation();
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

  const { language, level, progress, streak } = learning.data;

  return (
    <Screen edges={['top']}>
      <Text variant="title" style={{ textAlign: 'center' }}>
        {t('progress.title')}
      </Text>
      <View style={{ gap: 24, padding: 24 }}>
        <View style={{ gap: 16, marginBottom: 16, borderRadius: 8, borderWidth: 1, borderColor: '#CCD0D8' }}>
          <Text variant="heading" style={{ textAlign: 'center' }}>
            {t('progress.xp', { xp: progress?.totalXp ?? 0 })}n
          </Text>
          <Text variant="small" style={{ textAlign: 'center' }}>
            {t('progress.words', { words: progress?.wordsLearned ?? 0 })}n
          </Text>
          <Text variant="small" style={{ textAlign: 'center' }}>
            {t('progress.minutes', { minutes: progress?.minutesLearned ?? 0 })}n
          </Text>
        </View>
        <StatTile icon="flash-outline" value={String(level?.totalXp ?? 0)} label={t('progress.statXp')} />
        <StatTile icon="text-outline" value={String(level?.wordsLearned ?? 0)} label={t('progress.statWords')} />
        <StatTile icon="time-outline" value={String(level?.minutesLearned ?? 0)} label={t('progress.statMinutes')} />
        <StatTile icon="flame-outline" value={String(streak.days)} label={t('progress.statStreak')} />
      </View>
      <View style={{ marginTop: 24, alignItems: 'center' }}>
        <Button title={t('progress.continueLearning')} variant="secondary" onPress={() => router.push(ROUTES.learn)} />
      </View>
    </Screen>
  );
}
