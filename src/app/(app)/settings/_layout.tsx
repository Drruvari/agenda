import { Stack } from 'expo-router';

import { useAppTheme } from '@/theme/AppThemeProvider';
import { fonts } from '@/theme/fonts';

export default function SettingsLayout() {
  const theme = useAppTheme();
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: theme.background },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
        headerTitleStyle: { fontFamily: fonts.sansSemi },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Settings' }} />
      <Stack.Screen name="appearance" options={{ title: 'General' }} />
      <Stack.Screen name="editor" options={{ title: 'Editor' }} />
      <Stack.Screen name="sync" options={{ title: 'Sync' }} />
      <Stack.Screen name="export" options={{ title: 'Export' }} />
      <Stack.Screen name="privacy" options={{ title: 'Privacy' }} />
      <Stack.Screen name="general" options={{ title: 'General' }} />
      <Stack.Screen name="spaces" options={{ headerShown: false }} />
      <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
      <Stack.Screen name="about" options={{ headerShown: false }} />
    </Stack>
  );
}
