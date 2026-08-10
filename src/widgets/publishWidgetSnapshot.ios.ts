import { requireOptionalNativeModule } from 'expo';

import type { WidgetSnapshot } from './types';

export type PendingWidgetToggle = {
  id: string;
  completed: boolean;
};

export async function publishWidgetSnapshot(snapshot: WidgetSnapshot): Promise<void> {
  if (!requireOptionalNativeModule('ExpoWidgets')) return;

  // Keep expo-widgets out of the app's module graph until its native module is available.
  // This lets Expo Go and older development clients run without cascading Router errors.
  const { AgendaWidget } = await import('./AgendaWidget.ios');
  AgendaWidget.updateSnapshot(snapshot);
}

export async function drainPendingWidgetToggles(): Promise<PendingWidgetToggle[]> {
  return [];
}
