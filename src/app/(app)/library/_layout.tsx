import { Stack } from 'expo-router';

import { useAppTheme } from '@/theme';

export default function LibraryLayout() {
  const theme = useAppTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.background },
      }}
    />
  );
}
