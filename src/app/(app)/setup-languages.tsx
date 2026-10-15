import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { BackHandler, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { LanguageOption } from '@/components/LanguageOption';
import { Button, ErrorState, LoadingState, Screen, Text } from '@/components/ui';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useTheme } from '@/hooks/useTheme';
import { getRepositories } from '@/services/repositories';
import { useLearningStore } from '@/store/learningStore';
import type { LanguageCode } from '@/types';
import { ROUTES } from '@/utils/routing';

type Step = 'source' | 'target';

// After sign-in the learner names their own language (meanings are shown in it) and the
// language they want to learn. Opened again from Settings, it edits the saved choice.
export default function SetupLanguages() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const profile = useLearningStore((s) => s.profile);
  const saveProfile = useLearningStore((s) => s.saveProfile);
  // Fixed per mount on purpose: opened from a completed profile = edit; opened by a signed-in
  // learner without one = mandatory first setup. The profile never turns null here otherwise.
  const isEdit = profile !== null;
  const [step, setStep] = useState<Step>('source');
  const [source, setSource] = useState<LanguageCode | null>(profile?.source ?? null);
  const [target, setTarget] = useState<LanguageCode | null>(profile?.target ?? null);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const languages = useAsyncData(async () => {
    const repos = getRepositories();
    const [sources, targets] = await Promise.all([repos.languages.getSources(), repos.languages.getTargets()]);
    return { sources, targets };
  }, []);

  const chooseSource = (code: LanguageCode) => {
    setSource(code);
    if (target === code) setTarget(null); // own and learned language must differ
  };

  const save = async () => {
    if (!source || !target) return;
    setSaving(true);
    setSaveFailed(false);
    try {
      await saveProfile({ source, target });
      if (isEdit && router.canGoBack()) router.back();
      else router.replace(ROUTES.splash);
    } catch {
      setSaveFailed(true);
      setSaving(false);
    }
  };

  const isSourceStep = step === 'source';

  // Android hardware back on the first step of the flow:
  // - editing an existing profile (opened from Settings) falls through to the default
  //   behaviour, which pops back to the previous screen;
  // - the mandatory first setup swallows the press: falling through here would either exit
  //   the app or land on the splash, which only redirects right back into this screen.
  // On the target step the press always returns to the source step instead of leaving.
  // Returning "true" consumes the press, so a single tap cannot trigger two transitions.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!isSourceStep) {
        setStep('source');
        return true;
      }
      return !isEdit;
    });
    return () => subscription.remove();
  }, [isSourceStep, isEdit]);

  const list = languages.status === 'success' ? (isSourceStep ? languages.data.sources : languages.data.targets.filter((l) => l.code !== source)) : [];

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ headerBackVisible: isEdit, gestureEnabled: isEdit }} />
      <View style={{ gap: spacing.xs }}>
        <Text variant="caption" color="textSecondary">
          {t('setupLanguages.step', { step: isSourceStep ? 1 : 2, total: 2 })}
        </Text>
        <Text variant="title" accessibilityRole="header">
          {isSourceStep ? t('setupLanguages.sourceTitle') : t('setupLanguages.targetTitle')}
        </Text>
        <Text color="textSecondary">{isSourceStep ? t('setupLanguages.sourceSubtitle') : t('setupLanguages.targetSubtitle')}</Text>
      </View>

      {languages.status === 'loading' ? <LoadingState /> : null}
      {languages.status === 'error' ? <ErrorState onRetry={languages.reload} /> : null}
      {languages.status === 'success' ? (
        <View style={{ gap: spacing.sm }} accessibilityRole="radiogroup">
          {list.map((language) => (
            <LanguageOption
              key={language.code}
              language={language}
              checked={language.code === (isSourceStep ? source : target)}
              onPress={() => (isSourceStep ? chooseSource(language.code) : setTarget(language.code))}
            />
          ))}
        </View>
      ) : null}

      {saveFailed ? (
        <Text color="error" accessibilityLiveRegion="polite">
          {t('setupLanguages.saveFailed')}
        </Text>
      ) : null}

      {isSourceStep ? (
        <Button title={t('setupLanguages.next')} icon="arrow-forward-outline" iconDirectional disabled={!source} onPress={() => setStep('target')} />
      ) : (
        <View style={{ gap: spacing.sm }}>
          <Button title={t('setupLanguages.save')} icon="checkmark-outline" disabled={!target} loading={saving} onPress={() => void save()} />
          <Button title={t('setupLanguages.back')} variant="secondary" icon="arrow-back-outline" iconDirectional onPress={() => setStep('source')} />
        </View>
      )}
    </Screen>
  );
}
