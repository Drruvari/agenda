import type { NotificationPermissionsStatus } from 'expo-notifications';

import { applyNotificationPrivacy } from '@/features/privacy/notificationPrivacy';

import { configureNotificationHandler, getNotifications } from './expoNotifications';
import type { ReminderAccessState } from './reminders.types';

const CHANNEL_ID = 'agenda-reminders';

function mapPermission(permission: NotificationPermissionsStatus): ReminderAccessState {
  if (permission.granted) {
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

  await notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Agenda reminders',
    importance: notifications.AndroidImportance.HIGH,
  });
}

export async function getReminderAccessState(): Promise<ReminderAccessState> {
  const notifications = await getNotifications();

  if (!notifications) {
    return 'unavailable';
  }

  try {
    await configureReminders();

    const permission = await notifications.getPermissionsAsync();

    return mapPermission(permission);
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
    await configureReminders();

    const permission = await notifications.requestPermissionsAsync();

    return mapPermission(permission);
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
      channelId: CHANNEL_ID,
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
