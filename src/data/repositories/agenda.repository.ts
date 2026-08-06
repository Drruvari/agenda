import type { DatabaseClient } from '@/data/database/types';
import { createId, nowIso } from '@/data/schema/ids';
import type { AgendaItem, EventItem, NoteItem, Priority, RecurrenceRule, TaskItem } from '@/data/schema/types';

export type CreateTaskInput = {
  title: string;
  details?: string;
  spaceId?: string;
  priority?: Priority;
  date: string;
  time?: string;
  reminderAt?: string;
  notificationId?: string;
  recurrence?: RecurrenceRule;
};

export type CreateEventInput = CreateTaskInput & {
  durationMinutes: number;
  deviceEventId?: string;
};

export type CreateNoteInput = Omit<CreateTaskInput, 'priority'> & {
  priority?: Priority;
};

export function createAgendaRepository(db: DatabaseClient) {
  return {
    async list(): Promise<AgendaItem[]> {
      const items = await db.getAll<AgendaItem>('agenda_items');
      return items.sort((a, b) =>
        `${a.date} ${a.time ?? ''}`.localeCompare(`${b.date} ${b.time ?? ''}`),
      );
    },

    async getById(id: string): Promise<AgendaItem | null> {
      return db.getById<AgendaItem>('agenda_items', id);
    },

    async forDate(date: string, spaceId?: string | null): Promise<AgendaItem[]> {
      const items = await db.findWhere<AgendaItem>('agenda_items', { date });
      const filtered =
        spaceId && spaceId !== 'all' ? items.filter((item) => item.spaceId === spaceId) : items;

      return filtered.sort((a, b) => {
        if (a.time && b.time) {
          return a.time.localeCompare(b.time);
        }
        if (a.time) return 1;
        if (b.time) return -1;
        return a.title.localeCompare(b.title);
      });
    },

    async createTask(input: CreateTaskInput): Promise<TaskItem> {
      const now = nowIso();
      const item: TaskItem = {
        id: createId(),
        type: 'task',
        title: input.title.trim(),
        details: input.details?.trim() || undefined,
        spaceId: input.spaceId,
        priority: input.priority ?? 'none',
        date: input.date,
        time: input.time,
        reminderAt: input.reminderAt,
        notificationId: input.notificationId,
        recurrence: input.recurrence,
        completed: false,
        createdAt: now,
        updatedAt: now,
      };
      await db.put('agenda_items', item);
      return item;
    },

    async createEvent(input: CreateEventInput): Promise<EventItem> {
      const now = nowIso();
      const item: EventItem = {
        id: createId(),
        type: 'event',
        title: input.title.trim(),
        details: input.details?.trim() || undefined,
        spaceId: input.spaceId,
        priority: input.priority ?? 'none',
        date: input.date,
        time: input.time,
        reminderAt: input.reminderAt,
        notificationId: input.notificationId,
        deviceEventId: input.deviceEventId,
        durationMinutes: input.durationMinutes,
        recurrence: input.recurrence,
        createdAt: now,
        updatedAt: now,
      };
      await db.put('agenda_items', item);
      return item;
    },

    async createNote(input: CreateNoteInput): Promise<NoteItem> {
      const now = nowIso();
      const item: NoteItem = {
        id: createId(),
        type: 'note',
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
      };
      await db.put('agenda_items', item);
      return item;
    },

    async update(item: AgendaItem): Promise<AgendaItem> {
      const next = { ...item, updatedAt: nowIso() };
      await db.put('agenda_items', next);
      return next;
    },

    async complete(id: string): Promise<TaskItem | null> {
      const item = await db.getById<AgendaItem>('agenda_items', id);
      if (!item || item.type !== 'task' || item.completed) {
        return item?.type === 'task' ? item : null;
      }

      const next: TaskItem = {
        ...item,
        completed: true,
        completedAt: nowIso(),
        updatedAt: nowIso(),
      };
      await db.put('agenda_items', next);
      return next;
    },

    async uncomplete(id: string): Promise<TaskItem | null> {
      const item = await db.getById<AgendaItem>('agenda_items', id);
      if (!item || item.type !== 'task' || !item.completed) {
        return item?.type === 'task' ? item : null;
      }

      const next: TaskItem = {
        ...item,
        completed: false,
        completedAt: undefined,
        updatedAt: nowIso(),
      };
      await db.put('agenda_items', next);
      return next;
    },

    async delete(id: string): Promise<void> {
      await db.delete('agenda_items', id);
    },
  };
}

export type AgendaRepository = ReturnType<typeof createAgendaRepository>;
