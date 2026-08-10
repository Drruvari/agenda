import { requireOptionalNativeModule } from 'expo';

import type { WidgetSnapshot } from './types';

export type PendingWidgetToggle = {
  id: string;
  completed: boolean;
};

type AgendaWidgetModule = {
  publish(snapshot: string, generation: string): Promise<boolean>;
  drainPendingToggles(): Promise<string>;
};

export async function publishWidgetSnapshot(snapshot: WidgetSnapshot): Promise<void> {
  const module = requireOptionalNativeModule<AgendaWidgetModule>('AgendaWidget');
  if (!module) return;
  await module.publish(JSON.stringify(snapshot), String(snapshot.generation));
}

export async function drainPendingWidgetToggles(): Promise<PendingWidgetToggle[]> {
  const module = requireOptionalNativeModule<AgendaWidgetModule>('AgendaWidget');
  if (!module?.drainPendingToggles) return [];
  try {
    const raw = await module.drainPendingToggles();
    const parsed = JSON.parse(raw) as PendingWidgetToggle[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
