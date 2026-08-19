import type { DeviceSystemReminder, SystemReminderAccessState } from './systemReminders.types';

export const systemRemindersSupported = false;

export function getSystemReminderAccessState(): Promise<SystemReminderAccessState> {
  return Promise.resolve('unavailable');
}

export function requestSystemReminderAccess(): Promise<SystemReminderAccessState> {
  return Promise.resolve('unavailable');
}

export function listSystemReminders(
  _startDate: Date,
  _endDate: Date,
): Promise<DeviceSystemReminder[]> {
  return Promise.resolve([]);
}

export function completeSystemReminder(_id: string): Promise<void> {
  return Promise.resolve();
}
