export type NotificationsModule = typeof import('expo-notifications');

let cached: NotificationsModule | null | undefined;

export async function getNotifications(): Promise<NotificationsModule | null> {
  if (cached !== undefined) {
    return cached;
  }

  try {
    cached = await import('expo-notifications');
  } catch {
    cached = null;
  }

  return cached;
}

export function configureNotificationHandler(notifications: NotificationsModule): void {
  notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}
