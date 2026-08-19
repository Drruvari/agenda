import type { DatabaseClient } from '@/data/database/types';
import { createId, nowIso } from '@/data/schema/ids';
import type {
  AgendaItem,
  EventItem,
  NoteItem,
  Priority,
  RecurrenceRule,
  TaskItem,
} from '@/data/schema/types';
import { matchesSpaceFilter } from '@/data/spaces/spaceFilter';

type CreateAgendaItemInput = {
  title: string;
  details?: string;
  spaceId?: string;
  priority?: Priority;
  date: string;
  time?: string;
  reminderAt?: string;
  notificationId?: string;
};

export type CreateTaskInput = CreateAgendaItemInput & {
  recurrence?: RecurrenceRule;
};

export type CreateEventInput = CreateAgendaItemInput & {
  durationMinutes: number;
  deviceEventId?: string;
  recurrence?: RecurrenceRule;
};

export type CreateNoteInput = CreateAgendaItemInput;

function compareAgendaItems(left: AgendaItem, right: AgendaItem): number {
  const date = left.date.localeCompare(right.date);

  if (date !== 0) {
    return date;
  }

  if (left.time && right.time) {
    return left.time.localeCompare(right.time);
  }

  if (left.time) {
    return 1;
  }

  if (right.time) {
    return -1;
  }

  return left.title.localeCompare(right.title);
}

function createBaseItem(input: CreateAgendaItemInput) {
  const now = nowIso();

  return {
    id: createId(),
    title: input.title.trim(),
    details: input.details?.trim() || undefined,
    spaceId: input.spaceId,
    priority: input.priority ?? 'none',
    date: input.date,
    time: input.time,
    reminderAt: input.reminderAt,
    notificationId: input.notificationId,
    createdAt: now,
    updatedAt: now,
  } as const;
}

export function createAgendaRepository(db: DatabaseClient) {
  async function list(): Promise<AgendaItem[]> {
    const items = await db.getAll<AgendaItem>('agenda_items');

    return items.sort(compareAgendaItems);
  }

  async function getById(id: string): Promise<AgendaItem | null> {
    return db.getById<AgendaItem>('agenda_items', id);
  }

  async function forDate(date: string, spaceId?: string | null): Promise<AgendaItem[]> {
    const items = await db.findWhere<AgendaItem>('agenda_items', { date });

    return items
      .filter((item) => matchesSpaceFilter(item.spaceId, spaceId))
      .sort(compareAgendaItems);
  }

  async function forSpace(filterId: string | null): Promise<AgendaItem[]> {
    const items = await list();

    return items.filter((item) => matchesSpaceFilter(item.spaceId, filterId));
  }

  async function createTask(input: CreateTaskInput): Promise<TaskItem> {
    const item: TaskItem = {
      ...createBaseItem(input),
      type: 'task',
      recurrence: input.recurrence,
      completed: false,
    };

    await db.put('agenda_items', item);

    return item;
  }

  async function createEvent(input: CreateEventInput): Promise<EventItem> {
    const item: EventItem = {
      ...createBaseItem(input),
      type: 'event',
      deviceEventId: input.deviceEventId,
      durationMinutes: input.durationMinutes,
      recurrence: input.recurrence,
    };

    await db.put('agenda_items', item);

    return item;
  }

  async function createNote(input: CreateNoteInput): Promise<NoteItem> {
    const item: NoteItem = {
      ...createBaseItem(input),
      type: 'note',
    };

    await db.put('agenda_items', item);

    return item;
  }

  async function update(item: AgendaItem): Promise<AgendaItem> {
    const next: AgendaItem = {
      ...item,
      updatedAt: nowIso(),
    };

    await db.put('agenda_items', next);

    return next;
  }

  async function complete(id: string): Promise<TaskItem | null> {
    const item = await getById(id);

    if (!item || item.type !== 'task') {
      return null;
    }

    if (item.completed) {
      return item;
    }

    const now = nowIso();

    const next: TaskItem = {
      ...item,
      completed: true,
      completedAt: now,
      updatedAt: now,
    };

    await db.put('agenda_items', next);

    return next;
  }

  async function uncomplete(id: string): Promise<TaskItem | null> {
    const item = await getById(id);

    if (!item || item.type !== 'task') {
      return null;
    }

    if (!item.completed) {
      return item;
    }

    const next: TaskItem = {
      ...item,
      completed: false,
      completedAt: undefined,
      updatedAt: nowIso(),
    };

    await db.put('agenda_items', next);

    return next;
  }

  async function deleteItem(id: string): Promise<void> {
    await db.delete('agenda_items', id);
  }

  return {
    list,
    getById,
    forDate,
    forSpace,
    createTask,
    createEvent,
    createNote,
    update,
    complete,
    uncomplete,
    delete: deleteItem,
  };
}

export type AgendaRepository = ReturnType<typeof createAgendaRepository>;
