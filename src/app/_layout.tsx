import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AgendaToaster } from '@/components/ui/ToastProvider';
import { DataProvider } from '@/data';
import { AppSheetsProvider } from '@/features/app-sheets/AppSheetsContext';
import { AppSheetsHost } from '@/features/app-sheets/AppSheetsHost';
import { ItemEditorHost, ItemEditorProvider } from '@/features/item-editor';
import { EditSpaceHost, LibraryHost, LibraryProvider, SpacePickerHost } from '@/features/library';
import { AppLockProvider } from '@/features/privacy';
import { configureReminders } from '@/native/notifications/reminders';
import { useAppAppearance } from '@/theme';

export default function RootLayout() {
  useEffect(() => {
    void configureReminders();
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <DataProvider>
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
  return (
    <>
      <Stack screenOptions={{ contentStyle: { backgroundColor: theme.background } }}>
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
        <Stack.Screen name="(modals)" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="+not-found" options={{ title: 'Not found' }} />
      </Stack>
      <AgendaToaster />
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
