import { Stack } from 'expo-router';
import { PlatformColor } from 'react-native';

export default function LibraryLayout() {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: PlatformColor('systemGroupedBackground') },
        headerShown: false,
        headerShadowVisible: false,
        headerStyle: { backgroundColor: PlatformColor('systemGroupedBackground') },
        headerTintColor: PlatformColor('label'),
      }}
    >
      <Stack.Screen name="index" options={{ title: '' }} />
      <Stack.Screen name="items" options={{ headerShown: true, title: 'All Items' }} />
      <Stack.Screen name="inbox" options={{ headerShown: true, title: 'Inbox' }} />
      <Stack.Screen name="completed" options={{ headerShown: true, title: 'Completed' }} />
      <Stack.Screen name="notes" options={{ headerShown: true, title: 'Daily Notes' }} />
      <Stack.Screen name="space/[id]" options={{ headerShown: true, title: 'Space' }} />
    </Stack>
  );
}
