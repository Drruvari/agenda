import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { useAppAppearance, useAppTheme } from '@/theme';

export default function TabsLayout() {
  const { accent } = useAppAppearance();
  const theme = useAppTheme();

  return (
    <NativeTabs
      backgroundColor={theme.background}
      minimizeBehavior="onScrollDown"
      tintColor={accent}
    >
      <NativeTabs.Trigger name="(today)">
        <NativeTabs.Trigger.Icon sf={{ default: 'calendar', selected: 'calendar' }} />
        <NativeTabs.Trigger.Label>Agenda</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="page">
        <NativeTabs.Trigger.Icon sf={{ default: 'doc.text', selected: 'doc.text.fill' }} />
        <NativeTabs.Trigger.Label>Page</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="library">
        <NativeTabs.Trigger.Icon sf={{ default: 'books.vertical', selected: 'books.vertical' }} />
        <NativeTabs.Trigger.Label>Library</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="search" role="search" />
    </NativeTabs>
  );
}
