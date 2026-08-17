import type { NotificationPermissionsStatus } from 'expo-notifications';

import { applyNotificationPrivacy } from '@/features/privacy/notificationPrivacy';

import type { ReminderAccessState } from './reminders';

const CHANNEL_ID = 'agenda-reminders';

type NotificationsModule = typeof import('expo-notifications');

/**
 * Local notifications remain available in Expo Go on Android; only remote push was removed.
 * @see https://docs.expo.dev/versions/v57.0.0/sdk/notifications/
 */
function getNotifications(): NotificationsModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-notifications') as NotificationsModule;
  } catch {
    return null;
  }
}

function mapPermission(permission: NotificationPermissionsStatus): ReminderAccessState {
  if (permission.granted) return 'granted';
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
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Agenda reminders',
    importance: Notifications.AndroidImportance.HIGH,
  });
}

export async function getReminderAccessState(): Promise<ReminderAccessState> {
  const Notifications = getNotifications();
  if (!Notifications) return 'unavailable';

  try {
    await configureReminders();
    return mapPermission(await Notifications.getPermissionsAsync());
  } catch {
    return 'unavailable';
  }
}

export async function requestReminderAccess(): Promise<ReminderAccessState> {
  const Notifications = getNotifications();
  if (!Notifications) return 'unavailable';

  try {
    await configureReminders();
    return mapPermission(await Notifications.requestPermissionsAsync());
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
      channelId: CHANNEL_ID,
    },
  });
}

export async function cancelReminder(identifier?: string): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications || !identifier) return;
  await Notifications.cancelScheduledNotificationAsync(identifier);
}
