import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View, useColorScheme } from 'react-native';

import { palettes } from '@/theme/colors';
import { resolveScheme } from '@/theme/resolveScheme';
import { spacing } from '@/theme/tokens';

// Placeholder entry screen so the project compiles and runs. Replaced by the Splash screen
// (which decides Onboarding / Login / Home) when the Phase 1 screens are built.
export default function Index() {
  const { t } = useTranslation();
  const colors = palettes[resolveScheme('system', useColorScheme())];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>
        {t('app.name')}
      </Text>
      <Text style={[styles.tagline, { color: colors.textSecondary }]}>{t('app.tagline')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  title: { fontSize: 32, lineHeight: 50, fontWeight: '700', textAlign: 'center' },
  tagline: { fontSize: 16, lineHeight: 28, textAlign: 'center' },
});
