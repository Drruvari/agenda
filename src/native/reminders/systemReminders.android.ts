import type { DeviceSystemReminder, SystemReminderAccessState } from './systemReminders';

export const systemRemindersSupported = false;

export async function getSystemReminderAccessState(): Promise<SystemReminderAccessState> {
  return 'unavailable';
}

export async function requestSystemReminderAccess(): Promise<SystemReminderAccessState> {
  return 'unavailable';
}

export async function listSystemReminders(
  _startDate: Date,
  _endDate: Date,
): Promise<DeviceSystemReminder[]> {
  return [];
}

export async function completeSystemReminder(_id: string): Promise<void> {}
