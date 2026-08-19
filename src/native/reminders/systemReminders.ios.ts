import * as Calendar from 'expo-calendar';

import type { DeviceSystemReminder, SystemReminderAccessState } from './systemReminders.types';

export const systemRemindersSupported = true;

function mapPermission(status: string, canAskAgain: boolean): SystemReminderAccessState {
  if (status === 'granted') {
    return 'granted';
  }

  if (status === 'undetermined' || canAskAgain) {
    return 'undetermined';
  }

  return 'denied';
}

function startOfLocalDay(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  return start;
}

function isViewingLocalDay(startDate: Date, endDate: Date, day: Date): boolean {
  const dayStart = startOfLocalDay(day);
  const dayEnd = new Date(dayStart);

  dayEnd.setDate(dayEnd.getDate() + 1);

  return startDate < dayEnd && endDate > dayStart;
}

function toDate(value: string | Date | null | undefined): Date | undefined {
  if (!value) {
    return undefined;
  }

  const date = value instanceof Date ? value : new Date(value);

  return Number.isNaN(date.getTime()) ? undefined : date;
}

function toIsoString(value: string | Date | null | undefined): string | undefined {
  return toDate(value)?.toISOString();
}

function mapReminder(
  reminder: Calendar.ExpoCalendarReminder,
  calendarTitles: Map<string, string>,
): DeviceSystemReminder | null {
  if (!reminder.id || !reminder.title) {
    return null;
  }

  const dueDate = reminder.dueDate ?? reminder.startDate;

  return {
    id: reminder.id,
    title: reminder.title,
    dueDate: toIsoString(dueDate),
    allDay: reminder.allDay ?? !dueDate,
    notes: reminder.notes || undefined,
    listTitle: reminder.calendarId ? calendarTitles.get(reminder.calendarId) : undefined,
  };
}

function addReminders(
  target: Map<string, DeviceSystemReminder>,
  reminders: Calendar.ExpoCalendarReminder[],
  calendarTitles: Map<string, string>,
): void {
  for (const reminder of reminders) {
    const mapped = mapReminder(reminder, calendarTitles);

    if (mapped) {
      target.set(mapped.id, mapped);
    }
  }
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
  if ((await getSystemReminderAccessState()) !== 'granted') {
    return [];
  }

  try {
    const calendars = await Calendar.getCalendars(Calendar.EntityTypes.REMINDER);

    const calendarTitles = new Map(calendars.map((calendar) => [calendar.id, calendar.title]));

    const reminders = (
      await Promise.all(
        calendars.map((calendar) =>
          calendar.listReminders(startDate, endDate, Calendar.ReminderStatus.INCOMPLETE),
        ),
      )
    ).flat();

    const remindersById = new Map<string, DeviceSystemReminder>();

    addReminders(remindersById, reminders, calendarTitles);

    if (isViewingLocalDay(startDate, endDate, new Date())) {
      const allIncomplete = (
        await Promise.all(
          calendars.map((calendar) =>
            calendar.listReminders(null, null, Calendar.ReminderStatus.INCOMPLETE),
          ),
        )
      ).flat();

      for (const reminder of allIncomplete) {
        const dueDate = toDate(reminder.dueDate ?? reminder.startDate);

        if (dueDate && dueDate >= startDate) {
          continue;
        }

        const mapped = mapReminder(reminder, calendarTitles);

        if (mapped) {
          remindersById.set(mapped.id, mapped);
        }
      }
    }

    return [...remindersById.values()];
  } catch {
    return [];
  }
}

export async function completeSystemReminder(id: string): Promise<void> {
  const reminder = await Calendar.ExpoCalendarReminder.get(id);

  await reminder.update({
    completed: true,
    completionDate: new Date(),
  });
}
