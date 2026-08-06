import * as Calendar from 'expo-calendar';

import type { DeviceSystemReminder, SystemReminderAccessState } from './systemReminders';

export const systemRemindersSupported = true;

function mapPermission(status: string, canAskAgain: boolean): SystemReminderAccessState {
  if (status === 'granted') return 'granted';
  if (status === 'undetermined' || canAskAgain) return 'undetermined';
  return 'denied';
}

function localDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isViewingLocalDay(startDate: Date, endDate: Date, day: Date): boolean {
  const key = localDayKey(day);
  const cursor = new Date(startDate);
  while (cursor < endDate) {
    if (localDayKey(cursor) === key) return true;
    cursor.setDate(cursor.getDate() + 1);
  }
  return false;
}

function mapReminder(
  reminder: Calendar.ExpoCalendarReminder,
  titles: Map<string, string>,
): DeviceSystemReminder | null {
  if (!reminder.id || !reminder.title) return null;
  const dueDate = reminder.dueDate ?? reminder.startDate;
  return {
    id: reminder.id,
    title: reminder.title,
    dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
    allDay: reminder.allDay ?? !dueDate,
    notes: reminder.notes || undefined,
    listTitle: reminder.calendarId ? titles.get(reminder.calendarId) : undefined,
  };
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

  const inRange = (
    await Promise.all(
      calendars.map((calendar) =>
        calendar.listReminders(startDate, endDate, Calendar.ReminderStatus.INCOMPLETE),
      ),
    )
  ).flat();

  const byId = new Map<string, DeviceSystemReminder>();
  for (const reminder of inRange) {
    const mapped = mapReminder(reminder, titles);
    if (mapped) byId.set(mapped.id, mapped);
  }

  // Undated + overdue incomplete reminders belong on Today.
  if (isViewingLocalDay(startDate, endDate, new Date())) {
    const allIncomplete = (
      await Promise.all(
        calendars.map((calendar) =>
          calendar.listReminders(null, null, Calendar.ReminderStatus.INCOMPLETE),
        ),
      )
    ).flat();

    for (const reminder of allIncomplete) {
      const due = reminder.dueDate ?? reminder.startDate;
      if (due && new Date(due) >= startDate) continue;
      const mapped = mapReminder(reminder, titles);
      if (mapped) byId.set(mapped.id, mapped);
    }
  }

  return [...byId.values()];
}

export async function completeSystemReminder(id: string): Promise<void> {
  const reminder = await Calendar.ExpoCalendarReminder.get(id);
  await reminder.update({ completed: true, completionDate: new Date() });
}
