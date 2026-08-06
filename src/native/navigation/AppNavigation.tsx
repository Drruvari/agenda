import { Stack } from 'expo-router';

import { useAppTheme } from '@/theme';

/**
 * Shared navigation shell — Expo Router mechanics, Agenda chrome drawn in screens.
 */
export default function AppNavigation() {
  const theme = useAppTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.section },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="search" options={{ presentation: 'modal' }} />
      <Stack.Screen name="routines" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="tasks" />
    </Stack>
  );
}
