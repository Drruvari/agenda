import type { TableName } from './types';

type Mapper = {
  keyColumns: readonly string[];
  toRow: (record: Record<string, unknown>) => Record<string, unknown>;
  fromRow: (row: Record<string, unknown>) => Record<string, unknown>;
  columns: readonly string[];
};

function boolToInt(value: unknown): number {
  return value ? 1 : 0;
}

function intToBool(value: unknown): boolean {
  return value === 1 || value === true;
}

const spacesMapper: Mapper = {
  keyColumns: ['id'],
  columns: ['id', 'name', 'color', 'icon', 'is_pinned', 'is_system', 'sort_order', 'created_at'],
  toRow: (record) => ({
    id: record.id,
    name: record.name,
    color: record.color,
    icon: record.icon ?? null,
    is_pinned: boolToInt(record.isPinned),
    is_system: boolToInt(record.isSystem),
    sort_order: record.order ?? 0,
    created_at: record.createdAt,
  }),
  fromRow: (row) => ({
    id: row.id,
    name: row.name,
    color: row.color,
    icon: row.icon ?? undefined,
    isPinned: intToBool(row.is_pinned),
    isSystem: intToBool(row.is_system) || undefined,
    order: row.sort_order,
    createdAt: row.created_at,
  }),
};

const agendaItemsMapper: Mapper = {
  keyColumns: ['id'],
  columns: [
    'id',
    'type',
    'title',
    'details',
    'space_id',
    'priority',
    'date',
    'time',
    'reminder_at',
    'device_event_id',
    'notification_id',
    'completed',
    'completed_at',
    'duration_minutes',
    'recurrence',
    'created_at',
    'updated_at',
  ],
  toRow: (record) => ({
    id: record.id,
    type: record.type,
    title: record.title,
    details: record.details ?? null,
    space_id: record.spaceId ?? null,
    priority: record.priority,
    date: record.date,
    time: record.time ?? null,
    reminder_at: record.reminderAt ?? null,
    device_event_id: record.deviceEventId ?? null,
    notification_id: record.notificationId ?? null,
    completed: record.type === 'task' ? boolToInt(record.completed) : null,
    completed_at: record.completedAt ?? null,
    duration_minutes: record.durationMinutes ?? null,
    recurrence: record.recurrence ? JSON.stringify(record.recurrence) : null,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  }),
  fromRow: (row) => {
    const base = {
      id: row.id as string,
      title: row.title as string,
      details: (row.details as string | null) ?? undefined,
      spaceId: (row.space_id as string | null) ?? undefined,
      priority: row.priority,
      date: row.date as string,
      time: (row.time as string | null) ?? undefined,
      reminderAt: (row.reminder_at as string | null) ?? undefined,
      deviceEventId: (row.device_event_id as string | null) ?? undefined,
      notificationId: (row.notification_id as string | null) ?? undefined,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
      recurrence: row.recurrence ? JSON.parse(row.recurrence as string) : undefined,
    };

    if (row.type === 'task') {
      return {
        ...base,
        type: 'task',
        completed: intToBool(row.completed),
        completedAt: (row.completed_at as string | null) ?? undefined,
      };
    }

    if (row.type === 'event') {
      return {
        ...base,
        type: 'event',
        durationMinutes: (row.duration_minutes as number) ?? 30,
      };
    }

    return {
      ...base,
      type: 'note',
    };
  },
};

const routinesMapper: Mapper = {
  keyColumns: ['id'],
  columns: ['id', 'name', 'space_id', 'sort_order', 'active', 'created_at', 'updated_at'],
  toRow: (record) => ({
    id: record.id,
    name: record.name,
    space_id: record.spaceId ?? null,
    sort_order: record.order ?? 0,
    active: boolToInt(record.active ?? true),
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  }),
  fromRow: (row) => ({
    id: row.id,
    name: row.name,
    spaceId: (row.space_id as string | null) ?? undefined,
    order: row.sort_order,
    active: intToBool(row.active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }),
};

const routineCompletionsMapper: Mapper = {
  keyColumns: ['routine_id', 'date'],
  columns: ['routine_id', 'date', 'completed_at'],
  toRow: (record) => ({
    routine_id: record.routineId,
    date: record.date,
    completed_at: record.completedAt,
  }),
  fromRow: (row) => ({
    routineId: row.routine_id,
    date: row.date,
    completedAt: row.completed_at,
  }),
};

const dailyNotesMapper: Mapper = {
  keyColumns: ['id'],
  columns: ['id', 'date', 'body_text', 'drawing_id', 'updated_at'],
  toRow: (record) => ({
    id: record.id,
    date: record.date,
    body_text: record.bodyText ?? '',
    drawing_id: record.drawingId ?? null,
    updated_at: record.updatedAt,
  }),
  fromRow: (row) => ({
    id: row.id,
    date: row.date,
    bodyText: row.body_text,
    drawingId: (row.drawing_id as string | null) ?? undefined,
    updatedAt: row.updated_at,
  }),
};

const noteDraftsMapper: Mapper = {
  keyColumns: ['date'],
  columns: ['date', 'body_text', 'base_updated_at', 'updated_at'],
  toRow: (record) => ({
    date: record.date,
    body_text: record.bodyText ?? '',
    base_updated_at: record.baseUpdatedAt,
    updated_at: record.updatedAt,
  }),
  fromRow: (row) => ({
    date: row.date,
    bodyText: row.body_text,
    baseUpdatedAt: row.base_updated_at,
    updatedAt: row.updated_at,
  }),
};

const drawingsMapper: Mapper = {
  keyColumns: ['id'],
  columns: ['id', 'note_id', 'format', 'data', 'created_at', 'updated_at'],
  toRow: (record) => ({
    id: record.id,
    note_id: record.noteId,
    format: record.format,
    data: record.data,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  }),
  fromRow: (row) => ({
    id: row.id,
    noteId: row.note_id,
    format: row.format,
    data: row.data,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }),
};

const metaMapper: Mapper = {
  keyColumns: ['key'],
  columns: ['key', 'value'],
  toRow: (record) => ({
    key: record.key,
    value: record.value,
  }),
  fromRow: (row) => ({
    key: row.key,
    value: row.value,
  }),
};

export const TABLE_MAPPERS: Record<TableName, Mapper> = {
  spaces: spacesMapper,
  agenda_items: agendaItemsMapper,
  routines: routinesMapper,
  routine_completions: routineCompletionsMapper,
  daily_notes: dailyNotesMapper,
  note_drafts: noteDraftsMapper,
  drawings: drawingsMapper,
  meta: metaMapper,
};

function quoteIdent(column: string): string {
  return column === 'date' || column === 'time' ? `"${column}"` : column;
}

export function buildUpsertSql(table: TableName): string {
  const mapper = TABLE_MAPPERS[table];
  const columns = mapper.columns.map(quoteIdent);
  const conflictColumns = mapper.keyColumns.map(quoteIdent).join(', ');
  const updates = mapper.columns
    .filter((column) => !mapper.keyColumns.includes(column))
    .map((column) => {
      const quoted = quoteIdent(column);
      return `${quoted} = excluded.${quoted}`;
    })
    .join(', ');

  return `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')}) ON CONFLICT (${conflictColumns}) DO UPDATE SET ${updates}`;
}

export function compoundKey(table: TableName, record: Record<string, unknown>): string {
  if (table === 'routine_completions') {
    return `${record.routineId as string}::${record.date as string}`;
  }
  if (table === 'meta') {
    return record.key as string;
  }
  if (table === 'note_drafts') {
    return record.date as string;
  }
  return record.id as string;
}
