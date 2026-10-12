import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Icon, type IconName } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { fontFamilies } from '@/theme/typography';

const tabs: { name: string; titleKey: 'tabs.home' | 'tabs.learn' | 'tabs.progress' | 'tabs.profile'; icon: IconName }[] = [
  { name: 'home', titleKey: 'tabs.home', icon: 'home-outline' },
  { name: 'learn', titleKey: 'tabs.learn', icon: 'book-outline' },
  { name: 'progress', titleKey: 'tabs.progress', icon: 'stats-chart-outline' },
  { name: 'profile', titleKey: 'tabs.profile', icon: 'person-outline' },
];

export default function TabsLayout() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { fontFamily: fontFamilies.semibold, fontSize: 12 },
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: t(tab.titleKey),
            tabBarAccessibilityLabel: t(tab.titleKey),
            tabBarIcon: ({ focused }) => <Icon name={tab.icon} size={24} color={focused ? 'primary' : 'textSecondary'} />,
          }}
        />
      ))}
    </Tabs>
  );
}
