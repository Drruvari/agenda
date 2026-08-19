import { Alert } from 'react-native';

import { getReminderAccessState, requestReminderAccess } from '@/native/notifications/reminders';

function promptForNotificationPermission(): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      'Get reminders from Agenda',
      'Agenda can notify you when timed tasks are due.',
      [
        {
          text: 'Not now',
          style: 'cancel',
          onPress: () => resolve(false),
        },
        {
          text: 'Continue',
          onPress: async () => {
            const state = await requestReminderAccess();
            resolve(state === 'granted');
          },
        },
      ],
      {
        cancelable: true,
        onDismiss: () => resolve(false),
      },
    );
  });
}

export async function ensureNotificationPermissionForReminders(): Promise<boolean> {
  const state = await getReminderAccessState();

  if (state === 'granted') {
    return true;
  }

  if (state === 'denied' || state === 'unavailable') {
    Alert.alert(
      'Notifications are off',
      'Enable notifications for Agenda in system settings to get reminded about timed tasks.',
    );

    return false;
  }

  return promptForNotificationPermission();
}
