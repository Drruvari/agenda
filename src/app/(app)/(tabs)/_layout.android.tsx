import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { useAppTheme } from '@/theme/AppThemeProvider';
import { type } from '@/theme/type';

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
          backgroundColor: theme.background,
          borderTopColor: theme.separator,
          borderTopWidth: StyleSheet.hairlineWidth,
          elevation: 0,
        },
        tabBarItemStyle: styles.item,
      }}
    >
      <Tabs.Screen
        name="(today)"
        options={{
          title: 'Agenda',
          tabBarIcon: ({ color, size }) => (
            <Icon name="calendar" color={color as string} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="page"
        options={{
          title: 'Page',
          tabBarIcon: ({ color, size }) => (
            <Icon name="writing" color={color as string} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          tabBarIcon: ({ color, size }) => (
            <Icon name="notebook" color={color as string} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size }) => (
            <Icon name="search" color={color as string} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: type.caption.fontFamily,
    fontSize: 11,
    fontWeight: '500',
  },
  item: { paddingTop: 4 },
});
