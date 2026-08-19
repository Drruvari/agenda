import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AgendaToaster } from '@/components/ui/ToastProvider';
import { DataProvider } from '@/data/provider/DataProvider';
import { AppSheetsProvider } from '@/features/app-sheets/AppSheetsContext';
import { AppSheetsHost } from '@/features/app-sheets/AppSheetsHost';
import { ItemEditorProvider } from '@/features/item-editor/ItemEditorContext';
import { ItemEditorHost } from '@/features/item-editor/ItemEditorSheet';
import { EditSpaceHost } from '@/features/library/EditSpaceSheet';
import { LibraryProvider } from '@/features/library/LibraryContext';
import { LibraryHost } from '@/features/library/LibrarySheet';
import { SpacePickerHost } from '@/features/library/SpacePickerSheet';
import { AppLockProvider } from '@/features/privacy/AppLockProvider';
import { configureReminders } from '@/native/notifications/reminders';
import { useAppAppearance } from '@/theme/AppThemeProvider';
import { WidgetSync } from '@/widgets/WidgetSync';

export default function RootLayout() {
  useEffect(() => {
    void configureReminders();
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <DataProvider>
        <WidgetSync />
        <AppLockProvider>
          <ItemEditorProvider>
            <LibraryProvider>
              <AppSheetsProvider>
                <ThemedNavigation />
                <ItemEditorHost />
                <LibraryHost />
                <AppSheetsHost />
                <EditSpaceHost />
                <SpacePickerHost />
              </AppSheetsProvider>
            </LibraryProvider>
          </ItemEditorProvider>
        </AppLockProvider>
      </DataProvider>
    </GestureHandlerRootView>
  );
}

function ThemedNavigation() {
  const { colorScheme, theme } = useAppAppearance();

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(theme.background);
  }, [theme.background]);

  const navigationTheme = {
    ...(colorScheme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(colorScheme === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      background: theme.background,
      border: theme.separator,
      card: theme.section,
      primary: theme.primary,
      text: theme.text,
    },
  };

  return (
    <>
      <ThemeProvider value={navigationTheme}>
        <Stack screenOptions={{ contentStyle: { backgroundColor: theme.background } }}>
          <Stack.Screen name="(app)" options={{ headerShown: false }} />
          <Stack.Screen name="(modals)" options={{ headerShown: false, presentation: 'modal' }} />
          <Stack.Screen name="+not-found" options={{ title: 'Not found' }} />
        </Stack>
      </ThemeProvider>
      <AgendaToaster />
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
