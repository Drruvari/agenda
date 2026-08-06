import { Stack } from 'expo-router';

import { useAppTheme } from '@/theme';

export default function TasksLayout() {
  const theme = useAppTheme();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.section } }}>
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
