import * as Calendar from 'expo-calendar';

import type { DeviceSystemReminder, SystemReminderAccessState } from './systemReminders';

export const systemRemindersSupported = true;

function mapPermission(status: string, canAskAgain: boolean): SystemReminderAccessState {
  if (status === 'granted') return 'granted';
  if (status === 'undetermined' || canAskAgain) return 'undetermined';
  return 'denied';
}

export async function getSystemReminderAccessState(): Promise<SystemReminderAccessState> {
  try {
    const permission = await Calendar.getRemindersPermissions();
    return mapPermission(permission.status, permission.canAskAgain);
  } catch {
    return 'unavailable';
  }
}

export async function requestSystemReminderAccess(): Promise<SystemReminderAccessState> {
  try {
    const permission = await Calendar.requestRemindersPermissions();
    return mapPermission(permission.status, permission.canAskAgain);
  } catch {
    return 'unavailable';
  }
}

export async function listSystemReminders(
  startDate: Date,
  endDate: Date,
): Promise<DeviceSystemReminder[]> {
  if ((await getSystemReminderAccessState()) !== 'granted') return [];

  const calendars = await Calendar.getCalendars(Calendar.EntityTypes.REMINDER);
  const titles = new Map(calendars.map((calendar) => [calendar.id, calendar.title]));
  const reminders = await Promise.all(
    calendars.map((calendar) =>
      calendar.listReminders(startDate, endDate, Calendar.ReminderStatus.INCOMPLETE),
    ),
  );

  return reminders.flat().flatMap((reminder) => {
    if (!reminder.id || !reminder.title) return [];
    const dueDate = reminder.dueDate ?? reminder.startDate;
    return [
      {
        id: reminder.id,
        title: reminder.title,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        allDay: reminder.allDay ?? true,
        notes: reminder.notes || undefined,
        listTitle: reminder.calendarId ? titles.get(reminder.calendarId) : undefined,
      },
    ];
  });
}

export async function completeSystemReminder(id: string): Promise<void> {
  const reminder = await Calendar.ExpoCalendarReminder.get(id);
  await reminder.update({ completed: true, completionDate: new Date() });
}
