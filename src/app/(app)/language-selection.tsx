import { router } from 'expo-router';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { LanguageOption } from '@/components/LanguageOption';
import { ErrorState, LoadingState, Screen, Text } from '@/components/ui';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useTheme } from '@/hooks/useTheme';
import { getRepositories } from '@/services/repositories';
import { useLearningStore } from '@/store/learningStore';
import type { LanguageCode } from '@/types';
import { ROUTES } from '@/utils/routing';

// Switches the language being learned. The learner's own language is not offered here.
export default function LanguageSelection() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const profile = useLearningStore((s) => s.profile);
  const selectTarget = useLearningStore((s) => s.selectTarget);
  const languages = useAsyncData(() => getRepositories().languages.getTargets(), []);

  const choose = async (code: LanguageCode) => {
    await selectTarget(code).catch(() => undefined); // a failed save keeps the current language
    if (router.canGoBack()) router.back();
    else router.replace(ROUTES.home);
  };

  return (
    <Screen>
      <Text color="textSecondary">{t('languageSelection.subtitle')}</Text>
      {languages.status === 'loading' ? <LoadingState /> : null}
      {languages.status === 'error' ? <ErrorState onRetry={languages.reload} /> : null}
      {languages.status === 'success' ? (
        <View style={{ gap: spacing.sm }} accessibilityRole="radiogroup">
          {languages.data
            .filter((language) => language.code !== profile?.source)
            .map((language) => (
              <LanguageOption
                key={language.code}
                language={language}
                checked={language.code === profile?.target}
                onPress={() => void choose(language.code)}
              />
            ))}
        </View>
      ) : null}
    </Screen>
  );
}
