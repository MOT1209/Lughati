import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button, Icon, Text, type IconName } from '@/components/ui';
import { MIN_TOUCH_TARGET } from '@/constants/app';
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
  const insets = useSafeAreaInsets();
  const completeOnboarding = usePreferencesStore((s) => s.completeOnboarding);
  const [index, setIndex] = useState(0);
  const slide = slides[index]!;
  const isLast = index === slides.length - 1;

  const finish = () => {
    completeOnboarding();
    router.replace(ROUTES.login);
  };

  return (
    <LinearGradient
      colors={[colors.heroStart, colors.heroMid, colors.heroEnd]}
      locations={[0, 0.45, 1]}
      start={{ x: 1, y: 0 }}
      end={{ x: 0.2, y: 1 }}
      style={[styles.fill, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg, paddingHorizontal: spacing.lg }]}
    >
      <View style={styles.skipRow}>
        {!isLast ? (
          <Pressable onPress={finish} accessibilityRole="button" accessibilityLabel={t('common.skip')} style={styles.skip}>
            <Text variant="button" color="onHeroMuted">
              {t('common.skip')}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View style={[styles.center, { gap: spacing.lg }]}>
        <View style={[styles.iconWrap, { backgroundColor: 'rgba(255, 255, 255, 0.1)', borderColor: colors.heroGold, borderRadius: radius.xl }]}>
          <Icon name={slide.icon} size={72} color="heroGold" />
        </View>
        <Text variant="display" color="onHero" style={styles.text} accessibilityRole="header">
          {t(slide.title)}
        </Text>
        <Text color="onHeroMuted" style={styles.text}>
          {t(slide.body)}
        </Text>
      </View>

      <View style={{ gap: spacing.lg }}>
        <View style={styles.dots} accessible accessibilityLabel={t('onboarding.pageOf', { current: index + 1, total: slides.length })}>
          {slides.map((_, dot) => (
            <View
              key={dot}
              style={{
                width: dot === index ? 24 : 8,
                height: 8,
                borderRadius: radius.pill,
                backgroundColor: dot === index ? colors.heroGold : 'rgba(255, 255, 255, 0.3)',
              }}
            />
          ))}
        </View>
        <Button
          title={isLast ? t('onboarding.start') : t('common.next')}
          variant="gold"
          onPress={isLast ? finish : () => setIndex(index + 1)}
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, justifyContent: 'space-between' },
  skipRow: { minHeight: MIN_TOUCH_TARGET, alignItems: 'flex-end' },
  skip: { minHeight: MIN_TOUCH_TARGET, minWidth: MIN_TOUCH_TARGET, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12 },
  center: { alignItems: 'center' },
  iconWrap: { width: 144, height: 144, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  text: { textAlign: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
});
