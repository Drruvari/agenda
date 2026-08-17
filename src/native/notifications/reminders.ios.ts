import type { NotificationPermissionsStatus } from 'expo-notifications';

import { applyNotificationPrivacy } from '@/features/privacy/notificationPrivacy';

import type { ReminderAccessState } from './reminders';

type NotificationsModule = typeof import('expo-notifications');

function getNotifications(): NotificationsModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-notifications') as NotificationsModule;
  } catch {
    return null;
  }
}

function mapPermission(
  Notifications: NotificationsModule,
  permission: NotificationPermissionsStatus,
): ReminderAccessState {
  if (
    permission.granted ||
    permission.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  )
    return 'granted';
  if (permission.status === 'undetermined' || permission.canAskAgain) return 'undetermined';
  return 'denied';
}

export async function configureReminders(): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function getReminderAccessState(): Promise<ReminderAccessState> {
  const Notifications = getNotifications();
  if (!Notifications) return 'unavailable';

  try {
    return mapPermission(Notifications, await Notifications.getPermissionsAsync());
  } catch {
    return 'unavailable';
  }
}

export async function requestReminderAccess(): Promise<ReminderAccessState> {
  const Notifications = getNotifications();
  if (!Notifications) return 'unavailable';

  try {
    return mapPermission(Notifications, await Notifications.requestPermissionsAsync());
  } catch {
    return 'unavailable';
  }
}

export async function scheduleReminder(
  title: string,
  body: string | undefined,
  when: Date,
): Promise<string | null> {
  const Notifications = getNotifications();
  if (!Notifications) return null;
  if (when.getTime() <= Date.now()) return null;
  if ((await getReminderAccessState()) !== 'granted') return null;

  const preview = applyNotificationPrivacy(title, body);

  return Notifications.scheduleNotificationAsync({
    content: {
      title: preview.title,
      body: preview.body,
      data: { source: 'agenda' },
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: when,
    },
  });
}

export async function cancelReminder(identifier?: string): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications || !identifier) return;
  await Notifications.cancelScheduledNotificationAsync(identifier);
}
