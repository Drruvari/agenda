import { Stack } from 'expo-router';

import { useAppTheme } from '@/theme';

export default function SearchLayout() {
  const theme = useAppTheme();

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: theme.background },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: theme.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Search', headerTitleAlign: 'left' }} />
    </Stack>
  );
}
