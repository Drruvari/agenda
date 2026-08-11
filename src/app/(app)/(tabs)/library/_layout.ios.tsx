import { Stack } from 'expo-router';
import { PlatformColor } from 'react-native';

export default function LibraryLayout() {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: PlatformColor('systemBackground') },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: PlatformColor('systemBackground') },
        headerTintColor: PlatformColor('label'),
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Library',
        }}
      />
      <Stack.Screen name="items" options={{ title: 'All Items' }} />
      <Stack.Screen name="completed" options={{ title: 'Completed' }} />
      <Stack.Screen name="notes" options={{ title: 'Daily Notes' }} />
      <Stack.Screen name="space/[id]" options={{ title: 'Space' }} />
    </Stack>
  );
}
