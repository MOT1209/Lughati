import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { LanguageBadge } from '@/components/LanguageBadge';
import { Icon, Text } from '@/components/ui';
import { MIN_TOUCH_TARGET } from '@/constants/app';
import { useTheme } from '@/hooks/useTheme';
import { useUiLocale } from '@/hooks/useUiLocale';
import type { Language } from '@/types';
import { isolateNative } from '@/utils/bidi';
import { localize } from '@/utils/localize';

interface LanguageOptionProps {
  language: Language;
  checked: boolean;
  onPress: () => void;
}

/** One choosable language: flag, name, native name and a check mark when chosen. */
export function LanguageOption({ language, checked, onPress }: LanguageOptionProps) {
  const { t } = useTranslation();
  const { colors, radius, spacing } = useTheme();
  const { locale } = useUiLocale();
  const name = localize(language.name, locale);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={t('languageSelection.select', { language: name })}
      accessibilityState={{ checked }}
      style={({ pressed }) => [
        styles.row,
        {
          minHeight: MIN_TOUCH_TARGET + 16,
          gap: spacing.md,
          padding: spacing.md,
          borderRadius: radius.lg,
          borderWidth: checked ? 2 : 1,
          borderColor: checked ? colors.primary : colors.borderStrong,
          backgroundColor: checked ? colors.primaryMuted : colors.surface,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <LanguageBadge language={language} />
      <View style={styles.flex}>
        <Text variant="bodyStrong" color={checked ? 'onPrimaryMuted' : 'text'}>
          {name}
        </Text>
        {language.nativeName !== name ? (
          <Text variant="small" color="textSecondary">
            {isolateNative(language.nativeName, language.direction)}
          </Text>
        ) : null}
      </View>
      {checked ? <Icon name="checkmark-circle" color="primary" /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
});
