import { Stack } from 'expo-router';

import { useAppTheme } from '@/theme/AppThemeProvider';

export default function SearchLayout() {
  const theme = useAppTheme();
  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.background } }}
    />
  );
}
