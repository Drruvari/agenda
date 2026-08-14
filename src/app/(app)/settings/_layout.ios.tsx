import { Stack } from 'expo-router';
import { PlatformColor } from 'react-native';

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: PlatformColor('systemGroupedBackground') },
        headerShown: true,
        headerShadowVisible: false,
        headerStyle: { backgroundColor: PlatformColor('systemGroupedBackground') },
        headerTintColor: PlatformColor('label'),
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Settings',
          headerLargeTitle: true,
          headerLargeTitleShadowVisible: false,
        }}
      />
      <Stack.Screen name="appearance" options={{ title: 'General' }} />
      <Stack.Screen name="editor" options={{ title: 'Editor' }} />
      <Stack.Screen name="sync" options={{ title: 'Sync' }} />
      <Stack.Screen name="export" options={{ title: 'Export' }} />
      <Stack.Screen name="privacy" options={{ title: 'Privacy' }} />
      <Stack.Screen name="general" options={{ title: 'General' }} />
      <Stack.Screen name="spaces" options={{ title: 'Spaces' }} />
      <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
      <Stack.Screen name="about" options={{ title: 'About' }} />
    </Stack>
  );
}
