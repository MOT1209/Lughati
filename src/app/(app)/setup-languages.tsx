import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
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
  const saved = useLearningStore((s) => s.profile);
  const saveProfile = useLearningStore((s) => s.saveProfile);
  const [isEdit] = useState(saved !== null);
  const [step, setStep] = useState<Step>('source');
  const [source, setSource] = useState<LanguageCode | null>(saved?.source ?? null);
  const [target, setTarget] = useState<LanguageCode | null>(saved?.target ?? null);
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
