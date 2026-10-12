import { Redirect } from 'expo-router';

import { useAuthStore } from '@/store/authStore';
import { usePreferencesStore } from '@/store/preferencesStore';
import { resolveInitialRoute } from '@/utils/routing';

// Splash: the native splash stays up until _layout is ready; this route then decides where to go.
export default function Splash() {
  const hasSession = useAuthStore((s) => s.session !== null);
  const onboardingSeen = usePreferencesStore((s) => s.onboardingSeen);
  return <Redirect href={resolveInitialRoute({ hasSession, onboardingSeen })} />;
}
