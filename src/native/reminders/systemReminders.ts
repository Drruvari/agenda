export type SystemReminderAccessState = 'granted' | 'denied' | 'undetermined' | 'unavailable';

export type DeviceSystemReminder = {
  id: string;
  title: string;
  dueDate?: string;
  allDay: boolean;
  notes?: string;
  listTitle?: string;
};

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
