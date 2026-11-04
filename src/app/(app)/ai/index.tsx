import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Card, Icon, Screen, Text, type IconName } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { useUiLocale } from '@/hooks/useUiLocale';
import { useLearningStore } from '@/store/learningStore';
import { localize } from '@/utils/localize';
import { languages } from '@/mocks/languages';
import { ROUTES } from '@/utils/routing';

const FEATURES = [
  { key: 'tutor', icon: 'school-outline', href: ROUTES.aiTutor },
  { key: 'speaking', icon: 'chatbubbles-outline', href: ROUTES.aiSpeaking },
  { key: 'writing', icon: 'create-outline', href: ROUTES.aiWriting },
  { key: 'quiz', icon: 'help-circle-outline', href: ROUTES.aiQuiz },
  { key: 'pronunciation', icon: 'mic-outline', href: ROUTES.aiPronunciation },
  { key: 'planner', icon: 'calendar-outline', href: ROUTES.aiPlanner },
] as const satisfies readonly { key: string; icon: IconName; href: string }[];

export default function AiHome() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const { locale } = useUiLocale();
  const target = useLearningStore((s) => s.profile?.target);
  const language = languages.find((l) => l.code === target);

  return (
    <Screen edges={['bottom']}>
      <Text variant="body" color="textSecondary">
        {t('ai.subtitle', { language: language ? localize(language.name, locale) : '' })}
      </Text>
      <View style={{ gap: spacing.md }}>
        {FEATURES.map((f) => (
          <Pressable key={f.key} accessibilityRole="button" accessibilityLabel={t(`ai.features.${f.key}.title`)} onPress={() => router.push(f.href)}>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <Icon name={f.icon} size={28} color="primary" />
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="bodyStrong">{t(`ai.features.${f.key}.title`)}</Text>
                <Text variant="small" color="textSecondary">
                  {t(`ai.features.${f.key}.desc`)}
                </Text>
              </View>
              <Icon name="chevron-forward" directional size={20} color="textSecondary" />
            </Card>
          </Pressable>
        ))}
      </View>
      <Text variant="caption" color="textSecondary">
        {t('ai.disclaimer')}
      </Text>
    </Screen>
  );
}
