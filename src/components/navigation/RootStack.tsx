import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/useTheme';
import { getRouteAccess } from '@/utils/routing';

/**
 * Root navigator. Route protection depends only on whether a session exists: signed-out
 * users can reach (auth), signed-in users can reach (app), never both. A new auth method or
 * a new screen does not change this file.
 */
export function RootStack({ hasSession }: { hasSession: boolean }) {
  const { colors } = useTheme();
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
