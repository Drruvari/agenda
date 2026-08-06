export type ReminderAccessState = 'granted' | 'denied' | 'undetermined' | 'unavailable';

export async function configureReminders(): Promise<void> {}

export async function getReminderAccessState(): Promise<ReminderAccessState> {
  return 'unavailable';
}

export async function requestReminderAccess(): Promise<ReminderAccessState> {
  return 'unavailable';
}

export async function scheduleReminder(
  _title: string,
  _body: string | undefined,
  _when: Date,
): Promise<string | null> {
  return null;
}

export async function cancelReminder(_identifier?: string): Promise<void> {}
