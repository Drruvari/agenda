import { Stack } from 'expo-router';

import { OnboardingGate } from '@/features/onboarding/OnboardingGate';
import { useAppTheme } from '@/theme';

/** iOS uses the native stack header and toolbar on the planner screen. */
export default function AppNavigation() {
  const theme = useAppTheme();

  return (
    <OnboardingGate>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.section },
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
