import { isRunningInExpoGo } from 'expo';
import type { NotificationPermissionsStatus } from 'expo-notifications';

import type { ReminderAccessState } from './reminders';

const CHANNEL_ID = 'agenda-reminders';

type NotificationsModule = typeof import('expo-notifications');

/**
 * Expo Go on Android throws on import of expo-notifications (push APIs removed in SDK 53).
 * Load the module only in development/production builds.
 */
function getNotifications(): NotificationsModule | null {
  if (isRunningInExpoGo()) return null;
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
  if ((await requestReminderAccess()) !== 'granted') return null;

  return Notifications.scheduleNotificationAsync({
    content: { title, body, data: { source: 'agenda' }, sound: 'default' },
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
