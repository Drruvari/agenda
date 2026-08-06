import { Stack } from 'expo-router';

import { useAppTheme } from '@/theme';

export default function SettingsLayout() {
  const theme = useAppTheme();
  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.background } }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="general" />
      <Stack.Screen name="spaces" />
      <Stack.Screen name="appearance" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="about" />
    </Stack>
  );
}
