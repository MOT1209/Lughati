import { Cairo_400Regular, Cairo_600SemiBold, Cairo_700Bold, useFonts } from '@expo-google-fonts/cairo';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { applyLanguagePreference } from '@/i18n/applyPreference';
import { RootStack } from '@/components/navigation/RootStack';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/store/authStore';
import { usePreferencesStore } from '@/store/preferencesStore';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Cairo_400Regular, Cairo_600SemiBold, Cairo_700Bold });
  const hasHydrated = usePreferencesStore((s) => s.hasHydrated);
  const languagePreference = usePreferencesStore((s) => s.languagePreference);
  const authInitialized = useAuthStore((s) => s.initialized);
  const hasSession = useAuthStore((s) => s.session !== null);
  const initAuth = useAuthStore((s) => s.init);
  const [localeApplied, setLocaleApplied] = useState(false);
  const { isDark } = useTheme();

  useEffect(() => {
    void initAuth();
  }, [initAuth]);

  // Apply the stored language choice once preferences are loaded, and on every change.
  useEffect(() => {
    if (!hasHydrated) return;
    void applyLanguagePreference(languagePreference).then(() => setLocaleApplied(true));
  }, [hasHydrated, languagePreference]);

  const ready = fontsLoaded && hasHydrated && authInitialized && localeApplied;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <RootStack hasSession={hasSession} />
    </SafeAreaProvider>
  );
}
