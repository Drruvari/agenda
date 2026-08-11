import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { useAppAppearance } from '@/theme';

export default function TabsLayout() {
  const { accent } = useAppAppearance();

  return (
    <NativeTabs minimizeBehavior="onScrollDown" tintColor={accent}>
      <NativeTabs.Trigger name="(today)">
        <NativeTabs.Trigger.Icon sf={{ default: 'calendar', selected: 'calendar.circle.fill' }} />
        <NativeTabs.Trigger.Label>Today</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="library">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'books.vertical', selected: 'books.vertical.fill' }}
        />
        <NativeTabs.Trigger.Label>Library</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="search" role="search" />
    </NativeTabs>
  );
}
