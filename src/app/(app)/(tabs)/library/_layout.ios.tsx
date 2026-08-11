import { Stack } from 'expo-router';

import { useAppTheme } from '@/theme';

export default function LibraryLayout() {
  const theme = useAppTheme();

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: theme.background },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: theme.background },
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
