import { Stack } from 'expo-router';
import { PlatformColor, View } from 'react-native';

import { AgendaLogo } from '@/components/ui/AgendaLogo';
import { useAppTheme } from '@/theme/AppThemeProvider';

export default function TodayLayout() {
  const theme = useAppTheme();

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: PlatformColor('systemGroupedBackground') },
        headerLargeTitle: false,
        headerShown: true,
        headerShadowVisible: false,
        headerTintColor: PlatformColor('label'),
        headerTransparent: true,
        scrollEdgeEffects: { top: 'soft' },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Agenda',
          headerTitle: () => (
            <View accessibilityLabel="Agenda" accessible>
              <AgendaLogo color={theme.text} size={27} />
            </View>
          ),
        }}
      />
    </Stack>
  );
}
