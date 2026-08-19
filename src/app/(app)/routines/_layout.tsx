import { Stack } from 'expo-router';

import { useAppTheme } from '@/theme/AppThemeProvider';

export default function RoutinesLayout() {
  const theme = useAppTheme();
  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.background } }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
