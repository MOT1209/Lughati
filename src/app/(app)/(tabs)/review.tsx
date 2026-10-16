import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, Card, EmptyState, ErrorState, LoadingState, Screen, Text } from '@/components/ui';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useCurrentLearning } from '@/hooks/useCurrentLearning';
import { useTheme } from '@/hooks/useTheme';
import { getRepositories } from '@/services/repositories';
import { getVocabularyById } from '@/services/vocabulary';
import { useLearningStore } from '@/store/learningStore';
import type { ReviewOutcome, Vocabulary, VocabularyReviewState } from '@/types';
import { isolateTerm, meaningOf } from '@/utils/meaning';
import { ROUTES } from '@/utils/routing';

/** The four review outcomes, in the order they are offered (worst to best recall). */
const OUTCOMES: ReviewOutcome[] = ['again', 'difficult', 'good', 'easy'];

interface DueWord {
  word: Vocabulary;
  state: VocabularyReviewState;
}

/** `YYYY-MM-DD` from an ISO timestamp. Hermes has no Intl, and the day is all a learner needs here. */
function dayOf(iso: string | null): string {
  return iso ? iso.slice(0, 10) : '';
}

export default function Review() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const learning = useCurrentLearning();
  const source = useLearningStore((s) => s.profile?.source ?? null);
  const notifyProgressChanged = useLearningStore((s) => s.notifyProgressChanged);
  const userId = learning.user?.id ?? '';
  const code = learning.code;
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [saved, setSaved] = useState<VocabularyReviewState | null>(null);
  const [pendingOutcome, setPendingOutcome] = useState<ReviewOutcome | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const saving = useRef(false); // a double tap must not record the same review twice

  const data = useAsyncData(async () => {
    const [due, byId] = await Promise.all([
      getRepositories().reviews.getDue(userId, code),
      getVocabularyById(code),
    ]);
    const items: DueWord[] = [];
    for (const state of [...due].sort((a, b) => a.nextReviewAt.localeCompare(b.nextReviewAt))) {
      const word = byId.get(state.wordId);
      if (word) items.push({ word, state });
    }
    return { items };
  }, [userId, code]);

  if (learning.status === 'loading' || data.status === 'loading') {
    return (
      <Screen edges={['top']}>
        <LoadingState />
      </Screen>
    );
  }
  if (learning.status === 'error' || data.status === 'error') {
    const failure = data.status === 'error' ? data.error : learning.status === 'error' ? learning.error : undefined;
    return (
      <Screen edges={['top']}>
        <ErrorState error={failure} onRetry={data.status === 'error' ? data.reload : learning.reload} />
      </Screen>
    );
  }
  if (!userId || !learning.data.language) {
    // The (app) guard should prevent this; still, never review a guessed language or made-up user.
    return (
      <Screen edges={['top']}>
        <EmptyState
          title={t('review.title')}
          message={t('review.chooseLanguage')}
          actionLabel={t('review.chooseLanguageAction')}
          onAction={() => router.push(ROUTES.languageSelection)}
        />
      </Screen>
    );
  }

  const items = data.data.items;
  const current = items[index];
  const allDone = items.length > 0 && !current;

  const save = async (outcome: ReviewOutcome) => {
    if (!current || saving.current) return;
    saving.current = true;
    setPendingOutcome(outcome);
    setSaveFailed(false);
    try {
      const state = await getRepositories().reviews.recordReview(userId, code, current.word.id, outcome);
      setSaved(state);
      // A review changes what the app should recommend next (words due, daily plan), so the
      // screens that derive from recorded data re-read it.
      notifyProgressChanged();
    } catch {
      setSaveFailed(true);
    } finally {
      saving.current = false;
    }
  };

  const next = () => {
    setSaved(null);
    setPendingOutcome(null);
    setRevealed(false);
    setSaveFailed(false);
    setIndex((i) => i + 1);
  };

  if (items.length === 0) {
    return (
      <Screen edges={['top']}>
        <Card style={{ gap: spacing.md }}>
          <Text variant="subheading" color="textSecondary">
            {t('review.noDue')}
          </Text>
          <Text>{t('review.noDueDesc')}</Text>
          <Button title={t('common.continue')} icon="arrow-forward-outline" iconDirectional onPress={() => router.push(ROUTES.home)} />
        </Card>
      </Screen>
    );
  }

  if (allDone) {
    return (
      <Screen edges={['top']} contentStyle={{ justifyContent: 'center' }}>
        <Card style={{ gap: spacing.md, alignItems: 'center' }}>
          <Text variant="title" accessibilityRole="header" style={{ textAlign: 'center' }}>
            {t('review.allDone')}
          </Text>
          <Text>{t('review.allDoneDesc')}</Text>
        </Card>
        <Button title={t('common.continue')} icon="arrow-forward-outline" iconDirectional onPress={() => router.push(ROUTES.home)} />
      </Screen>
    );
  }

  const answered = saved !== null;
  const term = isolateTerm(current.word);
  const meaning = meaningOf(current.word, source);

  return (
    <Screen edges={['top']}>
      <Card style={{ gap: spacing.md }}>
        <Text variant="small" color="textSecondary">
          {t('review.progress', { current: Math.min(index + 1, items.length), total: items.length })}
        </Text>
        <Text variant="title" accessibilityRole="header">
          {term}
        </Text>

        {revealed || answered ? (
          <View style={{ gap: spacing.sm }} accessibilityLiveRegion="polite">
            <Text variant="small" color="textSecondary">
              {t('review.meaning')}
            </Text>
            <Text variant="bodyStrong">{meaning}</Text>
            {current.word.exampleSentence ? (
              <Text variant="caption" color="textSecondary">
                {t('review.example', { sentence: current.word.exampleSentence })}
              </Text>
            ) : null}
          </View>
        ) : (
          <Button title={t('review.showAnswer')} variant="secondary" onPress={() => setRevealed(true)} />
        )}

        {revealed && !answered ? (
          <View style={{ gap: spacing.sm }}>
            <Text color="textSecondary">{t('review.howDidItGo')}</Text>
            {OUTCOMES.map((outcome) => (
              <Button key={outcome} title={t(`review.${outcome}`)} onPress={() => save(outcome)} />
            ))}
          </View>
        ) : null}

        {answered ? (
          <View style={{ gap: spacing.sm }} accessibilityLiveRegion="polite">
            <Text color="textSecondary">
              {t('review.lastReviewed', { date: dayOf(saved.lastReviewedAt) })}
            </Text>
            <Text color="textSecondary">{t('review.nextReview', { date: dayOf(saved.nextReviewAt) })}</Text>
            <Button
              title={index === items.length - 1 ? t('lesson.finish') : t('review.nextWord')}
              onPress={next}
            />
          </View>
        ) : null}

        {saveFailed ? (
          <View style={{ gap: spacing.sm }} accessibilityLiveRegion="polite">
            <Text color="error">{t('review.saveFailed')}</Text>
            {pendingOutcome ? <Button title={t('common.retry')} onPress={() => save(pendingOutcome)} /> : null}
          </View>
        ) : null}
      </Card>
    </Screen>
  );
}
