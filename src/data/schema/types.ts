export type Priority = 'none' | 'low' | 'medium' | 'high';
export type ItemType = 'task' | 'event' | 'note';
export type ThemeMode = 'light' | 'dark' | 'system';
export type AccentColor =
  'blue' | 'red' | 'purple' | 'green' | 'brown' | 'orange' | 'magenta' | 'yellow';

export type PlannerMode = 'recent' | 'today' | 'upcoming';

export interface Space {
  id: string;
  name: string;
  color: string;
  icon?: string;
  isPinned: boolean;
  isSystem?: boolean;
  order: number;
  createdAt: string;
}

export interface RecurrenceRule {
  freq: 'yearly' | 'monthly' | 'weekly' | 'daily';
  interval?: number;
}

export interface AgendaItemBase {
  id: string;
  title: string;
  details?: string;
  spaceId?: string;
  priority: Priority;
  /** Calendar placement date, YYYY-MM-DD */
  date: string;
  /** Local time HH:mm — absent means all-day */
  time?: string;
  /** ISO timestamp for an Agenda-managed local notification. */
  reminderAt?: string;
  /** Native calendar event identifier when this item is mirrored to the device calendar. */
  deviceEventId?: string;
  /** Scheduled notification identifier used for cancellation and replacement. */
  notificationId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskItem extends AgendaItemBase {
  type: 'task';
  completed: boolean;
  completedAt?: string;
  recurrence?: RecurrenceRule;
}

export interface EventItem extends AgendaItemBase {
  type: 'event';
  durationMinutes: number;
  recurrence?: RecurrenceRule;
}

export interface NoteItem extends AgendaItemBase {
  type: 'note';
}

export type AgendaItem = TaskItem | EventItem | NoteItem;

export interface Routine {
  id: string;
  name: string;
  spaceId?: string;
  order: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Presence of a row means completed for that day. */
export interface RoutineCompletion {
  routineId: string;
  date: string;
  completedAt: string;
}

export interface DailyNote {
  id: string;
  date: string;
  bodyText: string;
  drawingId?: string;
  updatedAt: string;
}

export interface Drawing {
  id: string;
  noteId: string;
  format: 'ink-v1';
  data: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  general: {
    dateFormat: 'short' | 'long';
    weekStartsOn: 'sunday' | 'monday';
    mode: ThemeMode;
    accent: AccentColor;
    showSpaces: boolean;
    showCompleted: boolean;
    compactStream: boolean;
    keepFilterWhileChangingDays: boolean;
    calendarIndicators: boolean;
    clickToEdit: boolean;
    penOnlyDrawing: boolean;
  };
  editor: {
    font: 'system' | string;
    fontSize: number;
    pageMargin: number;
    defaultAddType: ItemType;
    defaultEventDurationMinutes: number;
    defaultSpaceId: string | null;
    smartParsingEnabled: boolean;
    continueNumberedLists: boolean;
    renderMarkdown: boolean;
  };
}

export const DEFAULT_SETTINGS: AppSettings = {
  general: {
    dateFormat: 'long',
    weekStartsOn: 'monday',
    mode: 'system',
    accent: 'blue',
    showSpaces: true,
    showCompleted: true,
    compactStream: false,
    keepFilterWhileChangingDays: true,
    calendarIndicators: true,
    clickToEdit: true,
    penOnlyDrawing: false,
  },
  editor: {
    font: 'system',
    fontSize: 17,
    pageMargin: 24,
    defaultAddType: 'task',
    defaultEventDurationMinutes: 30,
    defaultSpaceId: null,
    smartParsingEnabled: true,
    continueNumberedLists: true,
    renderMarkdown: false,
  },
};

export interface TodayRoutineView {
  routine: Routine;
  completed: boolean;
  spaceName?: string;
}

export interface TodayViewModel {
  date: string;
  spaces: Space[];
  allDay: AgendaItem[];
  scheduled: AgendaItem[];
  completed: TaskItem[];
  routines: TodayRoutineView[];
  dailyNote: DailyNote | null;
}
