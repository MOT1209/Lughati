import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { SegmentedControl } from '@/components/SegmentedControl';
import { Button, Card, Screen, Text } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { applyLanguagePreference } from '@/i18n/applyPreference';
import { reloadApp } from '@/services/direction';
import { useAuthStore } from '@/store/authStore';
import { usePreferencesStore } from '@/store/preferencesStore';
import type { LanguagePreference, ThemePreference } from '@/types';
import { isolateLtr } from '@/utils/bidi';
import { ROUTES } from '@/utils/routing';

export default function Settings() {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const themePreference = usePreferencesStore((s) => s.themePreference);
  const languagePreference = usePreferencesStore((s) => s.languagePreference);
  const setThemePreference = usePreferencesStore((s) => s.setThemePreference);
  const setLanguagePreference = usePreferencesStore((s) => s.setLanguagePreference);
  const user = useAuthStore((s) => s.session?.user);
  const signOut = useAuthStore((s) => s.signOut);
  const [restartNeeded, setRestartNeeded] = useState(false);
  const [dailyReminder, setDailyReminder] = useState(false); // UI only: no permission is requested
  const [signingOut, setSigningOut] = useState(false);

  const onLanguageChange = async (value: LanguagePreference) => {
    setLanguagePreference(value);
    const { direction } = await applyLanguagePreference(value);
    setRestartNeeded(direction === 'restart-required');
  };

  const onSignOut = async () => {
    setSigningOut(true);
    await signOut();
    router.replace(ROUTES.splash);
  };

  return (
    <Screen edges={['bottom']}>
      <Card style={{ gap: spacing.md }}>
        <Text variant="subheading">{t('settings.appearance')}</Text>
        <Text variant="small" color="textSecondary">
          {t('settings.theme')}
        </Text>
        <SegmentedControl<ThemePreference>
          accessibilityLabel={t('settings.theme')}
          value={themePreference}
          onChange={setThemePreference}
          options={[
            { value: 'system', label: t('settings.themeSystem') },
            { value: 'light', label: t('settings.themeLight') },
            { value: 'dark', label: t('settings.themeDark') },
          ]}
        />
        <Text variant="small" color="textSecondary">
          {t('settings.appLanguage')}
        </Text>
        <SegmentedControl<LanguagePreference>
          accessibilityLabel={t('settings.appLanguage')}
          value={languagePreference}
          onChange={(value) => void onLanguageChange(value)}
          options={[
            { value: 'system', label: t('settings.langSystem') },
            { value: 'ar', label: t('settings.langAr') },
            { value: 'en', label: t('settings.langEn') },
          ]}
        />
        {restartNeeded ? (
          <View style={{ gap: spacing.sm }} accessibilityLiveRegion="polite">
            <Text variant="bodyStrong">{t('settings.restartTitle')}</Text>
            <Text variant="small" color="textSecondary">
              {t('settings.restartMessage')}
            </Text>
            <Button title={t('settings.restartNow')} icon="refresh-outline" onPress={() => void reloadApp()} />
          </View>
        ) : null}
      </Card>

      <Card style={{ gap: spacing.sm }}>
        <Text variant="subheading">{t('settings.notifications')}</Text>
        <View style={[styles.row, { gap: spacing.md }]}>
          <Text style={styles.flex}>{t('settings.notificationsDaily')}</Text>
          <Switch
            value={dailyReminder}
            onValueChange={setDailyReminder}
            accessibilityLabel={t('settings.notificationsDaily')}
            trackColor={{ true: colors.primary, false: colors.border }}
          />
        </View>
        <Text variant="caption" color="textSecondary">
          {t('settings.notificationsNote')}
        </Text>
      </Card>

      <Card style={{ gap: spacing.md }}>
        <Text variant="subheading">{t('settings.account')}</Text>
        <Text color="textSecondary">{isolateLtr(user?.email ?? '')}</Text>
        <Button title={t('settings.signOut')} icon="log-out-outline" variant="danger" onPress={onSignOut} loading={signingOut} />
      </Card>

      <Card style={{ gap: spacing.xs }}>
        <Text variant="subheading">{t('settings.about')}</Text>
        <Text>{t('app.name')}</Text>
        <Text variant="small" color="textSecondary">
          {t('settings.version')}: {isolateLtr(Constants.expoConfig?.version ?? '1.0.0')}
        </Text>
        <Text variant="small" color="textSecondary">
          {t('settings.aboutText')}
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
});
