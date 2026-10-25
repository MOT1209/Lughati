import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { HeroProgress } from '@/components/HeroProgress';
import { ReviewOutcomeButton } from '@/components/ReviewOutcomeButton';
import { ScreenHero } from '@/components/ScreenHero';
import { Button, Card, EmptyState, ErrorState, LoadingState, Screen, Text } from '@/components/ui';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useCurrentLearning } from '@/hooks/useCurrentLearning';
import { useTheme } from '@/hooks/useTheme';
import { getRepositories } from '@/services/repositories';
import { getVocabularyById } from '@/services/vocabulary';
import { useLearningStore } from '@/store/learningStore';
import type { LanguageCode, ReviewOutcome, Vocabulary, VocabularyReviewState } from '@/types';
import { dayOf } from '@/utils/day';
import { scheduleReview } from '@/utils/srs';
import { isolateTerm, meaningOf } from '@/utils/meaning';
import { ROUTES } from '@/utils/routing';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** The four review outcomes, in the order they are offered (worst to best recall). */
const OUTCOMES: ReviewOutcome[] = ['again', 'difficult', 'good', 'easy'];

interface DueWord {
  word: Vocabulary;
  state: VocabularyReviewState;
}

/** The learner's local calendar day of an ISO timestamp, or '' when there is none. */
function localDay(iso: string | null): string {
  return iso ? dayOf(new Date(iso)) : '';
}

export default function Review() {
  const { t } = useTranslation();
  const learning = useCurrentLearning();
  const userId = learning.user?.id ?? '';
  const code = learning.code;
  // Tabs stay mounted, so the due list is re-read each time the tab comes back into view: words
  // fall due while the app is open and lessons add new ones. Not on progressVersion: a review
  // itself bumps it, and reloading mid-session would shift the list under the current index.
  const [visit, setVisit] = useState(0);
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      setVisit((n) => n + 1);
    }, []),
  );

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
    return { items, visit };
  }, [userId, code, visit]);

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

  // A new list starts a new session (index, revealed answer and save state reset with the key).
  // The previous list stays on screen until the new one has loaded (see useAsyncData).
  return <ReviewSession key={data.data.visit} items={data.data.items} userId={userId} code={code} />;
}

function ReviewSession({ items, userId, code }: { items: DueWord[]; userId: string; code: LanguageCode }) {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const source = useLearningStore((s) => s.profile?.source ?? null);
  const notifyProgressChanged = useLearningStore((s) => s.notifyProgressChanged);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [saved, setSaved] = useState<VocabularyReviewState | null>(null);
  const [pendingOutcome, setPendingOutcome] = useState<ReviewOutcome | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const saving = useRef(false); // a double tap must not record the same review twice

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
  const now = new Date();
  const intervalLabel = (outcome: ReviewOutcome) => {
    const next = scheduleReview(current.state, outcome, now);
    const days = Math.round((new Date(next.nextReviewAt).getTime() - now.getTime()) / MS_PER_DAY);
    return days <= 0 ? t('review.intervalNow') : t('review.intervalDays', { count: days });
  };

  return (
    <Screen edges={[]} contentStyle={{ padding: 0, gap: 0 }}>
      <ScreenHero
        eyebrow={t('review.title')}
        title={t('review.due', { count: items.length })}
        trailing={
          <Text variant="title" color="heroGold">
            {t('review.progress', { current: Math.min(index + 1, items.length), total: items.length })}
          </Text>
        }
      >
        <HeroProgress value={(index + (answered ? 1 : 0)) / items.length} accessibilityLabel={t('review.title')} />
      </ScreenHero>

      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        <Card style={{ gap: spacing.sm, alignItems: 'center', padding: spacing.xl }}>
          <Text variant="caption" color="textSecondary">
            {t('review.word')}
          </Text>
          <Text variant="display" accessibilityRole="header" style={{ textAlign: 'center' }}>
            {term}
          </Text>

          {revealed || answered ? (
            <View style={{ gap: spacing.xs, alignItems: 'center' }} accessibilityLiveRegion="polite">
              <Text variant="caption" color="textSecondary">
                {t('review.meaning')}
              </Text>
              <Text variant="title" color="primary" style={{ textAlign: 'center' }}>
                {meaning}
              </Text>
              {current.word.exampleSentence ? (
                <Text variant="small" color="textSecondary" style={{ textAlign: 'center' }}>
                  {t('review.example', { sentence: current.word.exampleSentence })}
                </Text>
              ) : null}
            </View>
          ) : (
            <Button title={t('review.showAnswer')} variant="secondary" onPress={() => setRevealed(true)} />
          )}
        </Card>

        {revealed && !answered ? (
          <View style={{ gap: spacing.sm }}>
            <Text color="textSecondary" style={{ textAlign: 'center' }}>
              {t('review.howDidItGo')}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {OUTCOMES.map((outcome) => (
                <ReviewOutcomeButton
                  key={outcome}
                  outcome={outcome}
                  title={t(`review.${outcome}`)}
                  interval={intervalLabel(outcome)}
                  onPress={() => save(outcome)}
                />
              ))}
            </View>
          </View>
        ) : null}

        {answered ? (
          <View style={{ gap: spacing.sm }} accessibilityLiveRegion="polite">
            <Text color="textSecondary" style={{ textAlign: 'center' }}>
              {t('review.lastReviewed', { date: localDay(saved.lastReviewedAt) })}
            </Text>
            <Text color="textSecondary" style={{ textAlign: 'center' }}>
              {t('review.nextReview', { date: localDay(saved.nextReviewAt) })}
            </Text>
            <Button
              title={index === items.length - 1 ? t('lesson.finish') : t('review.nextWord')}
              variant="gold"
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
      </View>
    </Screen>
  );
}
