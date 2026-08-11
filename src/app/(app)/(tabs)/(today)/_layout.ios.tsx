import { Stack } from 'expo-router';

import { useAppTheme } from '@/theme';

export default function TodayLayout() {
  const theme = useAppTheme();

  return (
    <Stack screenOptions={{ contentStyle: { backgroundColor: theme.background } }}>
      <Stack.Screen
        name="index"
        options={{
          title: '',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: theme.background },
        }}
      />
    </Stack>
  );
}
