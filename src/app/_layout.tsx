import { Cairo_400Regular } from '@expo-google-fonts/cairo/400Regular';
import { Cairo_600SemiBold } from '@expo-google-fonts/cairo/600SemiBold';
import { Cairo_700Bold } from '@expo-google-fonts/cairo/700Bold';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { RootNavigator } from '@/navigation/RootNavigator';
import { applyLanguagePreference } from '@/services/appLanguage';
import { useAuthStore } from '@/store/authStore';
import { usePreferencesStore } from '@/store/preferencesStore';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Cairo_400Regular, Cairo_600SemiBold, Cairo_700Bold });
  const hasHydrated = usePreferencesStore((s) => s.hasHydrated);
  const languagePreference = usePreferencesStore((s) => s.languagePreference);
  const authInitialized = useAuthStore((s) => s.initialized);
  const initAuth = useAuthStore((s) => s.init);
  const [localeApplied, setLocaleApplied] = useState(false);
  const { isDark } = useTheme();

  useEffect(() => {
    void initAuth();
  }, [initAuth]);

  // Apply the stored language choice once after hydration. Do not re-apply on every
  // preference change — Settings handles applyLanguagePreference when the user changes it.
  useEffect(() => {
    if (!hasHydrated) return;
    // Even if applying fails, the app starts with the default locale instead of a permanent splash.
    applyLanguagePreference(languagePreference)
      .catch(() => undefined)
      .finally(() => setLocaleApplied(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- languagePreference is read once on purpose; re-running would fight Settings
  }, [hasHydrated]);

  // A font failure must not hold the splash forever: fall back to the system font instead.
  const ready = (fontsLoaded || fontError !== null) && hasHydrated && authInitialized && localeApplied;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <RootNavigator />
    </SafeAreaProvider>
  );
}
