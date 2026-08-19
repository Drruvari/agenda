import type { NotificationPermissionsStatus } from 'expo-notifications';

import { applyNotificationPrivacy } from '@/features/privacy/notificationPrivacy';

import {
  configureNotificationHandler,
  getNotifications,
  type NotificationsModule,
} from './expoNotifications';
import type { ReminderAccessState } from './reminders.types';

function mapPermission(
  notifications: NotificationsModule,
  permission: NotificationPermissionsStatus,
): ReminderAccessState {
  if (
    permission.granted ||
    permission.ios?.status === notifications.IosAuthorizationStatus.PROVISIONAL
  ) {
    return 'granted';
  }

  if (permission.status === 'undetermined' || permission.canAskAgain) {
    return 'undetermined';
  }

  return 'denied';
}

export async function configureReminders(): Promise<void> {
  const notifications = await getNotifications();

  if (!notifications) {
    return;
  }

  configureNotificationHandler(notifications);
}

export async function getReminderAccessState(): Promise<ReminderAccessState> {
  const notifications = await getNotifications();

  if (!notifications) {
    return 'unavailable';
  }

  try {
    const permission = await notifications.getPermissionsAsync();

    return mapPermission(notifications, permission);
  } catch {
    return 'unavailable';
  }
}

export async function requestReminderAccess(): Promise<ReminderAccessState> {
  const notifications = await getNotifications();

  if (!notifications) {
    return 'unavailable';
  }

  try {
    const permission = await notifications.requestPermissionsAsync();

    return mapPermission(notifications, permission);
  } catch {
    return 'unavailable';
  }
}

export async function scheduleReminder(
  title: string,
  body: string | undefined,
  when: Date,
): Promise<string | null> {
  if (when.getTime() <= Date.now()) {
    return null;
  }

  if ((await getReminderAccessState()) !== 'granted') {
    return null;
  }

  const notifications = await getNotifications();

  if (!notifications) {
    return null;
  }

  const preview = applyNotificationPrivacy(title, body);

  return notifications.scheduleNotificationAsync({
    content: {
      title: preview.title,
      body: preview.body,
      data: {
        source: 'agenda',
      },
      sound: 'default',
    },
    trigger: {
      type: notifications.SchedulableTriggerInputTypes.DATE,
      date: when,
    },
  });
}

export async function cancelReminder(identifier?: string): Promise<void> {
  if (!identifier) {
    return;
  }

  const notifications = await getNotifications();

  if (!notifications) {
    return;
  }

  await notifications.cancelScheduledNotificationAsync(identifier);
}
