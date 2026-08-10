import type { WidgetSnapshot } from './types';

export type PendingWidgetToggle = {
  id: string;
  completed: boolean;
};

export async function publishWidgetSnapshot(_snapshot: WidgetSnapshot): Promise<void> {}

export async function drainPendingWidgetToggles(): Promise<PendingWidgetToggle[]> {
  return [];
}
