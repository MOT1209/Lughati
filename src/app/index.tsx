import { Redirect } from 'expo-router';

import { useAuthStore } from '@/store/authStore';
import { useLearningStore } from '@/store/learningStore';
import { usePreferencesStore } from '@/store/preferencesStore';
import { resolveInitialRoute } from '@/utils/routing';

// Splash: the native splash stays up until _layout is ready; this route then decides where to go.
export default function Splash() {
  const hasSession = useAuthStore((s) => s.session !== null);
  const onboardingSeen = usePreferencesStore((s) => s.onboardingSeen);
  const profileLoaded = useLearningStore((s) => s.profileLoaded);
  const hasLanguageProfile = useLearningStore((s) => s.profile !== null);
  // Signed in: wait until we know whether this account already chose its languages.
  if (hasSession && !profileLoaded) return null;
  return <Redirect href={resolveInitialRoute({ hasSession, onboardingSeen, hasLanguageProfile })} />;
}
