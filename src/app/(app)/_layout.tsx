import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/hooks/useTheme';
import { fontFamilies } from '@/theme/typography';
import { useLearningStore } from '@/store/learningStore';
import { getInAppAccess } from '@/utils/routing';

// Tabs are the base; language choice, lessons and Settings stack on top with a native header.
export default function AppLayout() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  // Guard values come from one testable policy instead of conditions scattered across screens.
  const profileLoaded = useLearningStore((s) => s.profileLoaded);
  const hasLanguageProfile = useLearningStore((s) => s.profile !== null);
  const access = getInAppAccess({ profileLoaded, hasLanguageProfile });

  // While the signed-in account's profile is still being read, no in-app screen is shown at
  // all: a deep link must neither flash a learning screen nor fall back to the wrong screen
  // before the access check has finished. A failed read resolves as "not chosen yet".
  if (!profileLoaded) return null;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: fontFamilies.semibold },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Protected guard={access.canSeeLearning}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack.Protected>
      {/* Choosing a target language edits an existing profile, so it needs the full setup too. */}
      <Stack.Protected guard={access.canSeeLearning}>
        <Stack.Screen name="language-selection" options={{ title: t('languageSelection.title') }} />
      </Stack.Protected>
      <Stack.Protected guard={access.canEditLanguages}>
        <Stack.Screen name="setup-languages" options={{ title: t('setupLanguages.title') }} />
      </Stack.Protected>
      <Stack.Protected guard={access.canSeeLearning}>
        <Stack.Screen name="lesson/[id]" options={{ title: t('lesson.title') }} />
      </Stack.Protected>
      <Stack.Protected guard={access.canSeeLearning}>
        <Stack.Screen name="settings" options={{ title: t('settings.title') }} />
      </Stack.Protected>
    </Stack>
  );
}
