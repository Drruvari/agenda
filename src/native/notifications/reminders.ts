import type { ReminderAccessState } from './reminders.types';

export function configureReminders(): Promise<void> {
  return Promise.resolve();
}

export function getReminderAccessState(): Promise<ReminderAccessState> {
  return Promise.resolve('unavailable');
}

export function requestReminderAccess(): Promise<ReminderAccessState> {
  return Promise.resolve('unavailable');
}

export function scheduleReminder(
  _title: string,
  _body: string | undefined,
  _when: Date,
): Promise<string | null> {
  return Promise.resolve(null);
}

export function cancelReminder(_identifier?: string): Promise<void> {
  return Promise.resolve();
}
