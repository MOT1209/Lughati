import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, Icon, Screen, Text, type IconName } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { usePreferencesStore } from '@/store/preferencesStore';
import { ROUTES } from '@/utils/routing';

const slides: { icon: IconName; title: 'onboarding.slide1Title' | 'onboarding.slide2Title' | 'onboarding.slide3Title'; body: 'onboarding.slide1Body' | 'onboarding.slide2Body' | 'onboarding.slide3Body' }[] = [
  { icon: 'earth-outline', title: 'onboarding.slide1Title', body: 'onboarding.slide1Body' },
  { icon: 'flag-outline', title: 'onboarding.slide2Title', body: 'onboarding.slide2Body' },
  { icon: 'flame-outline', title: 'onboarding.slide3Title', body: 'onboarding.slide3Body' },
];

export default function Onboarding() {
  const { t } = useTranslation();
  const { colors, spacing, radius } = useTheme();
  const completeOnboarding = usePreferencesStore((s) => s.completeOnboarding);
  const [index, setIndex] = useState(0);
  const slide = slides[index]!;
  const isLast = index === slides.length - 1;

  const finish = () => {
    completeOnboarding();
    router.replace(ROUTES.login);
  };

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.skipRow}>
        {!isLast ? <Button title={t('common.skip')} variant="ghost" onPress={finish} /> : null}
      </View>

      <View style={[styles.center, { gap: spacing.lg }]}>
        <View style={[styles.iconWrap, { backgroundColor: colors.primaryMuted, borderRadius: radius.xl }]}>
          <Icon name={slide.icon} size={72} color="onPrimaryMuted" />
        </View>
        <Text variant="display" style={styles.text}>
          {t(slide.title)}
        </Text>
        <Text color="textSecondary" style={styles.text}>
          {t(slide.body)}
        </Text>
      </View>

      <View style={{ gap: spacing.lg }}>
        <View
          style={styles.dots}
          accessible
          accessibilityLabel={t('onboarding.pageOf', { current: index + 1, total: slides.length })}
        >
          {slides.map((_, dot) => (
            <View
              key={dot}
              style={{
                width: dot === index ? 24 : 8,
                height: 8,
                borderRadius: radius.pill,
                backgroundColor: dot === index ? colors.primary : colors.border,
              }}
            />
          ))}
        </View>
        <Button title={isLast ? t('onboarding.start') : t('common.next')} onPress={isLast ? finish : () => setIndex(index + 1)} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'space-between' },
  skipRow: { minHeight: 48, alignItems: 'flex-end' },
  center: { alignItems: 'center' },
  iconWrap: { width: 144, height: 144, alignItems: 'center', justifyContent: 'center' },
  text: { textAlign: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
});
