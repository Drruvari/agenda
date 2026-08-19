import { Stack } from 'expo-router';
import { Platform } from 'react-native';

import { OnboardingGate } from '@/features/onboarding/OnboardingGate';
import { useAppTheme } from '@/theme/AppThemeProvider';

export default function AppNavigation() {
  const theme = useAppTheme();

  return (
    <OnboardingGate>
      <Stack
        screenOptions={{
          headerShown: false,
          ...(Platform.OS !== 'ios' && {
            contentStyle: {
              backgroundColor: theme.background,
            },
          }),
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="onboarding"
          options={{
            gestureEnabled: false,
            animation: 'fade',
          }}
        />
        <Stack.Screen name="routines" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="tasks" />
      </Stack>
    </OnboardingGate>
  );
}
