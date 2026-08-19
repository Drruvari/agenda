export type SystemReminderAccessState = 'granted' | 'denied' | 'undetermined' | 'unavailable';

export type DeviceSystemReminder = {
  id: string;
  title: string;
  dueDate?: string;
  allDay: boolean;
  notes?: string;
  listTitle?: string;
};
