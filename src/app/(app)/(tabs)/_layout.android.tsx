import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { useAppTheme } from '@/theme';

export default function AndroidTabsLayout() {
  const theme = useAppTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: theme.background },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: styles.label,
        tabBarStyle: {
          backgroundColor: theme.section,
          borderTopColor: theme.separator,
          borderTopWidth: StyleSheet.hairlineWidth,
          elevation: 8,
        },
        tabBarItemStyle: styles.item,
      }}
    >
      <Tabs.Screen
        name="(today)"
        options={{
          title: 'Agenda',
          tabBarIcon: ({ color, focused, size }) => (
            <Icon name="calendar" color={color as string} size={focused ? size + 2 : size} />
          ),
        }}
      />
      <Tabs.Screen
        name="page"
        options={{
          title: 'Page',
          tabBarIcon: ({ color, focused, size }) => (
            <Icon name="writing" color={color as string} size={focused ? size + 2 : size} />
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

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '600' },
  item: { paddingTop: 4 },
});
