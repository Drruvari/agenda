import { Tabs } from 'expo-router';

import { Icon } from '@/components/ui/Icon';
import { useAppAppearance, useAppTheme } from '@/theme';

export default function AndroidTabsLayout() {
  const { accent } = useAppAppearance();
  const theme = useAppTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: theme.background },
        tabBarActiveTintColor: accent,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarStyle: {
          height: 76,
          paddingTop: 8,
          paddingBottom: 10,
          backgroundColor: theme.section,
          borderTopColor: theme.separator,
        },
        tabBarItemStyle: { borderRadius: 20, marginHorizontal: 6 },
      }}
    >
      <Tabs.Screen
        name="(today)"
        options={{
          title: 'Today',
          tabBarIcon: ({ color, focused, size }) => (
            <Icon name="calendar" color={color as string} size={focused ? size + 2 : size} />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          tabBarIcon: ({ color, focused, size }) => (
            <Icon name="notebook" color={color as string} size={focused ? size + 2 : size} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, focused, size }) => (
            <Icon name="search" color={color as string} size={focused ? size + 2 : size} />
          ),
        }}
      />
    </Tabs>
  );
}
