import { Stack } from 'expo-router';
import { PlatformColor } from 'react-native';

export default function SearchLayout() {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: PlatformColor('systemBackground') },
        headerShown: false,
        headerShadowVisible: false,
        headerStyle: { backgroundColor: PlatformColor('systemBackground') },
        headerTintColor: PlatformColor('label'),
      }}
    >
      <Stack.Screen name="index" options={{ title: '' }} />
    </Stack>
  );
}
