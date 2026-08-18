import { Stack } from 'expo-router';

import { OnboardingGate } from '@/features/onboarding/OnboardingGate';
import { useAppTheme } from '@/theme';

/**
 * Shared navigation shell — Expo Router mechanics, Agenda chrome drawn in screens.
 */
export default function AppNavigation() {
  const theme = useAppTheme();
  return (
    <OnboardingGate>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.background },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="routines" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="tasks" />
      </Stack>
    </OnboardingGate>
  );
}
