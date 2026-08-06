import type { NotificationPreviewMode } from './types';
import { DEFAULT_APP_LOCK_PREFERENCES } from './types';

let cachedMode: NotificationPreviewMode = DEFAULT_APP_LOCK_PREFERENCES.notificationPreview;

export function setNotificationPreviewMode(mode: NotificationPreviewMode): void {
  cachedMode = mode;
}

export function getNotificationPreviewMode(): NotificationPreviewMode {
  return cachedMode;
}

export function applyNotificationPrivacy(
  title: string,
  body: string | undefined,
): { title: string; body: string | undefined } {
  switch (cachedMode) {
    case 'title':
      return { title, body: undefined };
    case 'private':
      return { title: 'Agenda reminder', body: undefined };
    case 'full':
    default:
      return { title, body };
  }
}
