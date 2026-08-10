export type WidgetSourceStatus = 'ok' | 'denied' | 'error' | 'unavailable';

export type WidgetRow = {
  id: string;
  title: string;
  section: 'allDay' | 'scheduled';
  time?: string;
  completed: boolean;
  /** Scheduled item whose start time has already passed today. */
  late?: boolean;
  /** Agenda tasks only — events/notes/external rows are not completable. */
  checkable: boolean;
  source: 'agenda' | 'calendar' | 'birthday' | 'reminder';
};

export type WidgetSnapshot = {
  schemaVersion: 1;
  generation: number;
  date: string;
  generatedAt: string;
  remainingCount: number;
  rows: WidgetRow[];
  sources: Record<'agenda' | 'calendar' | 'birthdays' | 'reminders', WidgetSourceStatus>;
};
