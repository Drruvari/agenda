export type LockDelay = 'immediately' | 'after_30_seconds' | 'after_1_minute' | 'after_5_minutes';

export type NotificationPreviewMode = 'full' | 'title' | 'private';

export type AppLockPreferences = {
  enabled: boolean;
  delay: LockDelay;
  notificationPreview: NotificationPreviewMode;
};

export const DEFAULT_APP_LOCK_PREFERENCES: AppLockPreferences = {
  enabled: false,
  delay: 'immediately',
  notificationPreview: 'full',
};

export const LOCK_DELAY_OPTIONS: { label: string; value: LockDelay }[] = [
  { label: 'Immediately', value: 'immediately' },
  { label: 'After 30 seconds', value: 'after_30_seconds' },
  { label: 'After 1 minute', value: 'after_1_minute' },
  { label: 'After 5 minutes', value: 'after_5_minutes' },
];

export const NOTIFICATION_PREVIEW_OPTIONS: {
  label: string;
  subtitle: string;
  value: NotificationPreviewMode;
}[] = [
  {
    label: 'Full',
    subtitle: 'Title and details appear on the lock screen.',
    value: 'full',
  },
  {
    label: 'Title only',
    subtitle: 'Show the task title, hide details.',
    value: 'title',
  },
  {
    label: 'Private',
    subtitle: 'Show only “Agenda reminder”.',
    value: 'private',
  },
];

export function lockDelayToMs(delay: LockDelay): number {
  switch (delay) {
    case 'immediately':
      return 0;
    case 'after_30_seconds':
      return 30_000;
    case 'after_1_minute':
      return 60_000;
    case 'after_5_minutes':
      return 5 * 60_000;
  }
}

export function lockDelayLabel(delay: LockDelay): string {
  return LOCK_DELAY_OPTIONS.find((option) => option.value === delay)?.label ?? 'Immediately';
}
