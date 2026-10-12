import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ErrorState, Icon, LoadingState, Screen, Text } from '@/components/ui';
import { MIN_TOUCH_TARGET } from '@/constants/app';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useTheme } from '@/hooks/useTheme';
import { useUiLocale } from '@/hooks/useUiLocale';
import { getRepositories } from '@/services/repositories';
import { useAuthStore } from '@/store/authStore';
import { useLearningStore } from '@/store/learningStore';
import { isolateLtr } from '@/utils/bidi';
import { localize } from '@/utils/localize';

export default function LanguageSelection() {
  const { t } = useTranslation();
  const { colors, radius, spacing } = useTheme();
  const { locale } = useUiLocale();
  const userDefault = useAuthStore((s) => s.session?.user.targetLanguage);
  const selected = useLearningStore((s) => s.selectedTarget);
  const selectTarget = useLearningStore((s) => s.selectTarget);
  const current = selected ?? userDefault;
  const languages = useAsyncData(() => getRepositories().languages.getTargets(), []);

  return (
    <Screen>
      <Text color="textSecondary">{t('languageSelection.subtitle')}</Text>
      {languages.status === 'loading' ? <LoadingState /> : null}
      {languages.status === 'error' ? <ErrorState onRetry={languages.reload} /> : null}
      {languages.status === 'success' ? (
        <View style={{ gap: spacing.sm }}>
          {languages.data.map((language) => {
            const isCurrent = language.code === current;
            const name = localize(language.name, locale);
            return (
              <Pressable
                key={language.code}
                onPress={() => {
                  selectTarget(language.code);
                  router.back();
                }}
                accessibilityRole="radio"
                accessibilityLabel={t('languageSelection.select', { language: name })}
                accessibilityState={{ selected: isCurrent }}
                style={[
                  styles.row,
                  {
                    minHeight: MIN_TOUCH_TARGET + 16,
                    gap: spacing.md,
                    padding: spacing.md,
                    borderRadius: radius.lg,
                    borderWidth: isCurrent ? 2 : 1,
                    borderColor: isCurrent ? colors.primary : colors.border,
                    backgroundColor: colors.surface,
                  },
                ]}
              >
                <Text style={styles.flag}>{language.flag}</Text>
                <View style={styles.flex}>
                  <Text variant="bodyStrong">{name}</Text>
                  <Text variant="small" color="textSecondary">
                    {isolateLtr(language.nativeName)}
                  </Text>
                </View>
                {isCurrent ? <Icon name="checkmark-circle" color="primary" /> : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  flag: { fontSize: 32, lineHeight: 46 },
});
