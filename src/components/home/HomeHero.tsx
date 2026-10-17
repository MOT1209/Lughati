import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { LanguageBadge } from '@/components/LanguageBadge';
import { Icon, Text } from '@/components/ui';
import { MIN_TOUCH_TARGET } from '@/constants/app';
import { useTheme } from '@/hooks/useTheme';
import type { Language } from '@/types';
import { fontFamilies } from '@/theme/typography';
import { isolateNative } from '@/utils/bidi';

import { GoalRing } from './GoalRing';

interface HomeHeroProps {
  name: string;
  streakDays: number;
  language: Language | null;
  languageName: string;
  minutesToday: number;
  goalMinutes: number;
  onChangeLanguage: () => void;
  /** Room left at the bottom for the card that overlaps the hero. */
  overlap: number;
}

/** Brand header of Home: the icon's dark teal gradient with greeting, streak, language and daily goal. */
export function HomeHero({ name, streakDays, language, languageName, minutesToday, goalMinutes, onChangeLanguage, overlap }: HomeHeroProps) {
  const { t } = useTranslation();
  const { colors, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={[colors.heroStart, colors.heroMid, colors.heroEnd]}
      locations={[0, 0.5, 1]}
      start={{ x: 1, y: 0 }}
      end={{ x: 0.2, y: 1 }}
      style={{
        paddingTop: insets.top + spacing.lg,
        paddingHorizontal: spacing.lg,
        paddingBottom: overlap + spacing.lg,
        borderBottomLeftRadius: radius.xl,
        borderBottomRightRadius: radius.xl,
        gap: spacing.lg,
      }}
    >
      <View style={[styles.between, { gap: spacing.md }]}>
        <View style={styles.flex}>
          <Text variant="title" color="onHero" accessibilityRole="header">
            {t('home.greeting', { name })}
          </Text>
          <Text variant="small" color="onHeroMuted">
            {t('home.tagline')}
          </Text>
        </View>
        <View
          style={[styles.row, styles.streak, { gap: spacing.xs, borderRadius: radius.pill, paddingHorizontal: spacing.md, borderColor: colors.heroGold }]}
          accessible
          accessibilityLabel={t('home.streakAria', { count: streakDays })}
        >
          <Icon name="flame" size={16} color="heroGold" />
          <Text variant="bodyStrong" color="heroGold">
            {t('home.streakDays', { count: streakDays })}
          </Text>
        </View>
      </View>

      {language ? (
        <View style={[styles.row, styles.pill, { gap: spacing.sm, borderRadius: radius.md, paddingHorizontal: spacing.md }]}>
          <LanguageBadge language={language} />
          <View style={[styles.row, styles.flex, { gap: spacing.sm }]}>
            <Text variant="bodyStrong" color="onHero">
              {languageName}
            </Text>
            {language.nativeName !== languageName ? (
              <Text variant="small" color="onHeroMuted">
                {isolateNative(language.nativeName, language.direction)}
              </Text>
            ) : null}
          </View>
          <Pressable
            onPress={onChangeLanguage}
            accessibilityRole="button"
            accessibilityLabel={t('home.changeLanguage')}
            hitSlop={8}
            style={({ pressed }) => [
              styles.chip,
              { backgroundColor: colors.heroChip, borderRadius: radius.pill, paddingHorizontal: spacing.md, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Text variant="caption" color="onHeroChip" style={styles.chipText}>
              {t('home.change')}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <GoalRing minutesToday={minutesToday} goalMinutes={goalMinutes} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  between: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  flex: { flex: 1 },
  streak: { borderWidth: 1, minHeight: 32, backgroundColor: 'rgba(255, 200, 87, 0.14)' },
  pill: { minHeight: MIN_TOUCH_TARGET, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.16)', backgroundColor: 'rgba(255, 255, 255, 0.08)' },
  chip: { minHeight: 32, justifyContent: 'center' },
  chipText: { fontFamily: fontFamilies.bold },
});
