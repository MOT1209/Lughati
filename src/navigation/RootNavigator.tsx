import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/store/authStore';
import { getRouteAccess } from '@/utils/routing';

// Route protection depends only on whether a session exists (not on how it was created), so
// adding Google/Apple sign-in later does not touch this file. Adding a screen = adding a file.
export function RootNavigator() {
  const { colors } = useTheme();
  const hasSession = useAuthStore((s) => s.session !== null);
  const access = getRouteAccess(hasSession);

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="index" />
      <Stack.Protected guard={access.canSeeAuth}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={access.canSeeApp}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
    </Stack>
  );
}
