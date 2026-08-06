import type { SettingsStore } from '@/data/settings/types';

import {
  type AppLockPreferences,
  DEFAULT_APP_LOCK_PREFERENCES,
  type LockDelay,
  type NotificationPreviewMode,
} from './types';

/** Device-local only — never included in AppSettings / backup export. */
export const SECURITY_KEYS = {
  appLockEnabled: 'security.appLockEnabled',
  appLockDelay: 'security.appLockDelay',
  notificationPreview: 'security.notificationPreview',
} as const;

const DELAYS: LockDelay[] = [
  'immediately',
  'after_30_seconds',
  'after_1_minute',
  'after_5_minutes',
];

const PREVIEWS: NotificationPreviewMode[] = ['full', 'title', 'private'];

function parseDelay(raw: string | null): LockDelay {
  if (raw && DELAYS.includes(raw as LockDelay)) return raw as LockDelay;
  return DEFAULT_APP_LOCK_PREFERENCES.delay;
}

function parsePreview(raw: string | null): NotificationPreviewMode {
  if (raw && PREVIEWS.includes(raw as NotificationPreviewMode)) {
    return raw as NotificationPreviewMode;
  }
  return DEFAULT_APP_LOCK_PREFERENCES.notificationPreview;
}

export async function loadAppLockPreferences(
  store: Pick<SettingsStore, 'getItem'>,
): Promise<AppLockPreferences> {
  const [enabled, delay, preview] = await Promise.all([
    store.getItem(SECURITY_KEYS.appLockEnabled),
    store.getItem(SECURITY_KEYS.appLockDelay),
    store.getItem(SECURITY_KEYS.notificationPreview),
  ]);

  return {
    enabled: enabled === 'true',
    delay: parseDelay(delay),
    notificationPreview: parsePreview(preview),
  };
}

export async function saveAppLockEnabled(
  store: Pick<SettingsStore, 'setItem'>,
  enabled: boolean,
): Promise<void> {
  await store.setItem(SECURITY_KEYS.appLockEnabled, enabled ? 'true' : 'false');
}

export async function saveAppLockDelay(
  store: Pick<SettingsStore, 'setItem'>,
  delay: LockDelay,
): Promise<void> {
  await store.setItem(SECURITY_KEYS.appLockDelay, delay);
}

export async function saveNotificationPreview(
  store: Pick<SettingsStore, 'setItem'>,
  mode: NotificationPreviewMode,
): Promise<void> {
  await store.setItem(SECURITY_KEYS.notificationPreview, mode);
}
