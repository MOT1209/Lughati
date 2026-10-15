import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Card, EmptyState, ErrorState, Icon, LoadingState, Screen, Text, Button } from '@/components/ui';
import { useCurrentLearning } from '@/hooks/useCurrentLearning';
import { useTheme } from '@/hooks/useTheme';
import { useUiLocale } from '@/hooks/useUiLocale';
import { localize } from '@/utils/localize';
import { isolateTerm } from '@/utils/meaning';
import { meaningOf } from '@/utils/meaning';
import { getRepositories } from '@/services/repositories';
import { ROUTES } from '@/utils/routing';

export default async function Review() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const { locale } = useUiLocale();
  const learning = useCurrentLearning();
  const repos = getRepositories();

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
  const code = language?.code ?? 'de';

  const { reviews } = await repos.reviews.get('u1', code);

  const due = reviews
    .filter((s) => s.nextReviewAt <= new Date().toISOString())
    .sort((a, b) => a.nextReviewAt.localeCompare(b.nextReviewAt));

  if (due.length === 0) {
    return (
      <Screen edges={['top']}>
        <Card style={{ gap: 'md' }}>
          <Text variant="subtitle" color="textSecondary">
            {t('review.noDue')}
          </Text>
          <Text variant="body">{t('review.noDueDesc')}</Text>
          <Button title={t('common.continue')} icon="arrow-right" onPress={() => router.push(ROUTES.home)} />
        </Card>
      </Screen>
    );
  }

  const word = due[0];

  const handleOutcome = (outcome: string) => {
    repos.reviews.recordReview('u1', code, word.wordId, outcome as any);
    router.push(ROUTES.home);
  };

  return (
    <Screen edges={['top']}>
      <Card style={{ gap: 'md' }}>
        <Text variant="title" accessibilityRole="header">
          {t('review.title', { word: isolateTerm(word) })}
        </Text>

        <Card style={{ gap: 'sm' }}>
          <Text variant="body">{word.term}</Text>
          {word.exampleSentence ? (
            <Text variant="caption" color="textSecondary">
              {t('review.example', { sentence: word.exampleSentence })}
            </Text>
          ) : null}
        </Card>

        <Card style={{ gap: 'sm' }}>
          <Text variant="subtitle" color="textSecondary">
            {t('review.due')} {word.nextReviewAt}
          </Text>
          <Text variant="body">{t('review.outcomes')}:</Text>
          <View style={{ gap: 'xs' }}>
            <Button title={t('review.again')} onPress={() => handleOutcome('again')} />
            <Button title={t('review.difficult')} onPress={() => handleOutcome('difficult')} />
            <Button title={t('review.good')} onPress={() => handleOutcome('good')} />
            <Button title={t('review.easy')} onPress={() => handleOutcome('easy')} />
          </View>
        </Card>

        {word.lastReviewedAt ? (
          <Card style={{ gap: 'sm', marginTop: 12 }}>
            <Text variant="small" color="textSecondary">
              {t('review.lastReviewed')} {word.lastReviewedAt}
            </Text>
            <Text variant="caption" color="textSecondary">
              {t('review.nextReview')} {word.nextReviewAt}
            </Text>
          </Card>
        ) : null}

        <Button title={t('common.back')} icon="arrow-left" onPress={() => router.push(ROUTES.home)} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
});