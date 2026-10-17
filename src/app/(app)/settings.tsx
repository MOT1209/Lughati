import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { SegmentedControl } from '@/components/SegmentedControl';
import { SettingsSection } from '@/components/SettingsSection';
import { Button, Screen, Text } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { applyLanguagePreference } from '@/services/appLanguage';
import { AuthError } from '@/services/auth';
import { reloadApp } from '@/services/direction';
import { useAuthStore } from '@/store/authStore';
import { usePreferencesStore } from '@/store/preferencesStore';
import type { LanguagePreference, ThemePreference } from '@/types';
import { isolateLtr } from '@/utils/bidi';
import { ROUTES } from '@/utils/routing';

export default function Settings() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const themePreference = usePreferencesStore((s) => s.themePreference);
  const languagePreference = usePreferencesStore((s) => s.languagePreference);
  const setThemePreference = usePreferencesStore((s) => s.setThemePreference);
  const setLanguagePreference = usePreferencesStore((s) => s.setLanguagePreference);
  const user = useAuthStore((s) => s.session?.user);
  const signOut = useAuthStore((s) => s.signOut);
  const [restartNeeded, setRestartNeeded] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [restartFailed, setRestartFailed] = useState(false);
  const [languageChangeFailed, setLanguageChangeFailed] = useState(false);

  // The persisted preference also drives the root layout; applying here updates the texts
  // immediately and tells us whether the direction needs a restart.
  const onLanguageChange = async (value: LanguagePreference) => {
    const previous = languagePreference;
    setLanguagePreference(value);
    setLanguageChangeFailed(false);
    try {
      const { direction } = await applyLanguagePreference(value);
      setRestartNeeded(direction === 'restart-required');
      setRestartFailed(false);
    } catch {
      // Applying failed: keep the choice that is actually in effect instead of a half-applied one.
      setLanguagePreference(previous);
      setLanguageChangeFailed(true);
    }
  };

  const onRestart = async () => {
    setRestartFailed(!(await reloadApp()));
  };

  const onSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } catch (error) {
      if (error instanceof AuthError && error.code === 'sign_out_not_persisted') {
        // Signed out for now, but the stored session survived: say so instead of pretending.
        Alert.alert(t('settings.signOut'), t('auth.errors.sign_out_not_persisted'));
      } else {
        setSigningOut(false); // the session is unchanged; the button is usable again
        return;
      }
    }
    router.replace(ROUTES.splash);
  };

  return (
    <Screen edges={['bottom']}>
      <SettingsSection icon="color-palette-outline" title={t('settings.appearance')}>
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
          onChange={onLanguageChange}
          options={[
            { value: 'system', label: t('settings.langSystem') },
            { value: 'ar', label: t('settings.langAr') },
            { value: 'en', label: t('settings.langEn') },
          ]}
        />
        {languageChangeFailed ? (
          <Text variant="small" color="error" accessibilityLiveRegion="polite">
            {t('settings.languageChangeFailed')}
          </Text>
        ) : null}
        {restartNeeded ? (
          <View style={{ gap: spacing.sm }} accessibilityLiveRegion="polite">
            <Text variant="bodyStrong">{t('settings.restartTitle')}</Text>
            <Text variant="small" color="textSecondary">
              {t('settings.restartMessage')}
            </Text>
            <Button title={t('settings.restartNow')} icon="refresh-outline" onPress={onRestart} />
            {restartFailed ? (
              <Text variant="small" color="error">
                {t('settings.restartFailed')}
              </Text>
            ) : null}
          </View>
        ) : null}
      </SettingsSection>

      <SettingsSection icon="language-outline" title={t('settings.learningLanguages')}>
        <Button title={t('settings.learningLanguages')} variant="secondary" icon="swap-horizontal-outline" onPress={() => router.push(ROUTES.setupLanguages)} />
      </SettingsSection>

      <SettingsSection icon="person-circle-outline" title={t('settings.account')}>
        <Text color="textSecondary">{isolateLtr(user?.email ?? '')}</Text>
        <Button title={t('settings.signOut')} icon="log-out-outline" variant="danger" onPress={onSignOut} loading={signingOut} />
      </SettingsSection>

      <SettingsSection icon="information-circle-outline" title={t('settings.about')}>
        <Text>{t('app.name')}</Text>
        <Text variant="small" color="textSecondary">
          {t('settings.version', { version: isolateLtr(Constants.expoConfig?.version ?? '1.0.0') })}
        </Text>
        <Text variant="small" color="textSecondary">
          {t('settings.aboutText')}
        </Text>
      </SettingsSection>
    </Screen>
  );
}
