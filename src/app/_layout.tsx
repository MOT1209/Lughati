import { Cairo_400Regular, Cairo_600SemiBold, Cairo_700Bold, useFonts } from '@expo-google-fonts/cairo';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { getDeviceLanguageCode, setUiLocale } from '@/i18n';
import { isRtlLocale, resolveLocale } from '@/i18n/resolveLocale';
import { useTheme } from '@/hooks/useTheme';
import { applyLayoutDirection } from '@/services/direction';
import { useAuthStore } from '@/store/authStore';
import { usePreferencesStore } from '@/store/preferencesStore';
import { getRouteAccess } from '@/utils/routing';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Cairo_400Regular, Cairo_600SemiBold, Cairo_700Bold });
  const hasHydrated = usePreferencesStore((s) => s.hasHydrated);
  const languagePreference = usePreferencesStore((s) => s.languagePreference);
  const authInitialized = useAuthStore((s) => s.initialized);
  const hasSession = useAuthStore((s) => s.session !== null);
  const initAuth = useAuthStore((s) => s.init);
  const [localeApplied, setLocaleApplied] = useState(false);
  const { colors, isDark } = useTheme();

  useEffect(() => {
    void initAuth();
  }, [initAuth]);

  // Apply the stored language choice once preferences are loaded, and on every change.
  useEffect(() => {
    if (!hasHydrated) return;
    const locale = resolveLocale(languagePreference, getDeviceLanguageCode());
    applyLayoutDirection(isRtlLocale(locale));
    void setUiLocale(locale).then(() => setLocaleApplied(true));
  }, [hasHydrated, languagePreference]);

  const ready = fontsLoaded && hasHydrated && authInitialized && localeApplied;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  const access = getRouteAccess(hasSession);

  return (
    <SafeAreaProvider>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="index" />
        <Stack.Protected guard={access.canSeeAuth}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={access.canSeeApp}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
      </Stack>
    </SafeAreaProvider>
  );
}
