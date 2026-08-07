import type { AgendaItem, ItemType, Priority, RecurrenceRule } from '@/data/schema/types';

export type EditorKind = 'task' | 'event' | 'note' | 'routine';

export type ItemEditorMode =
  | { type: 'create'; kind?: EditorKind }
  | { type: 'edit'; itemId: string }
  | { type: 'edit-routine'; routineId: string }
  | { type: 'quick-add' };

/** UI recurrence — maps to RecurrenceRule when not `never`. */
export type RecurrenceChoice = 'never' | RecurrenceRule['freq'];

export type ItemEditorDraft = {
  kind: EditorKind;
  title: string;
  details: string;
  date: string;
  /** Empty + timed=false → all-day / time off. */
  time: string;
  timed: boolean;
  remindAtTime: boolean;
  spaceId: string;
  priority: Priority;
  durationMinutes: number;
  recurrence: RecurrenceChoice;
  routineActive: boolean;
};

export type ItemEditorSession = { mode: ItemEditorMode };

export const PRIORITY_OPTIONS: { label: string; value: Priority }[] = [
  { label: 'None', value: 'none' },
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
];

export const RECURRENCE_OPTIONS: { label: string; value: RecurrenceChoice }[] = [
  { label: 'Never', value: 'never' },
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Yearly', value: 'yearly' },
];

export const REMINDER_OPTIONS: { label: string; value: 'none' | 'at_time' }[] = [
  { label: 'None', value: 'none' },
  { label: 'At time', value: 'at_time' },
];

export const KIND_OPTIONS: { label: string; value: EditorKind }[] = [
  { label: 'Task', value: 'task' },
  { label: 'Event', value: 'event' },
  { label: 'Note', value: 'note' },
  { label: 'Routine', value: 'routine' },
];

export const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120].map((minutes) => ({
  label: minutes < 60 ? `${minutes} min` : `${minutes / 60} hr`,
  value: String(minutes),
}));

export function kindFromItemType(type: ItemType): EditorKind {
  return type;
}

export function editorTitle(mode: ItemEditorMode, kind: EditorKind): string {
  if (mode.type === 'edit' || mode.type === 'edit-routine') {
    if (kind === 'event') return 'Edit event';
    if (kind === 'note') return 'Edit note';
    if (kind === 'routine') return 'Edit routine';
    return 'Edit task';
  }
  if (mode.type === 'quick-add') return 'Quick add';
  if (kind === 'event') return 'New event';
  if (kind === 'note') return 'New note';
  if (kind === 'routine') return 'New routine';
  return 'New task';
}

export function recurrenceToRule(choice: RecurrenceChoice): RecurrenceRule | undefined {
  if (choice === 'never') return undefined;
  return { freq: choice };
}

export function recurrenceFromRule(rule?: RecurrenceRule): RecurrenceChoice {
  return rule?.freq ?? 'never';
}

export function emptyDraft(
  date: string,
  kind: EditorKind,
  spaceId: string,
  durationMinutes: number,
): ItemEditorDraft {
  const isEvent = kind === 'event';
  const now = new Date();
  const time = isEvent
    ? `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    : '';
  return {
    kind,
    title: '',
    details: '',
    date,
    time,
    timed: isEvent,
    remindAtTime: false,
    spaceId,
    priority: 'none',
    durationMinutes,
    recurrence: 'never',
    routineActive: true,
  };
}

export function draftFromItem(item: AgendaItem): ItemEditorDraft {
  const recurrence =
    item.type === 'task' || item.type === 'event' ? recurrenceFromRule(item.recurrence) : 'never';

  return {
    kind: kindFromItemType(item.type),
    title: item.title,
    details: item.details ?? '',
    date: item.date,
    time: item.time ?? '',
    timed: Boolean(item.time),
    remindAtTime: Boolean(item.reminderAt || item.notificationId),
    spaceId: item.spaceId ?? '',
    priority: item.type === 'note' ? 'none' : item.priority,
    durationMinutes: item.type === 'event' ? item.durationMinutes : 30,
    recurrence,
    routineActive: true,
  };
}
