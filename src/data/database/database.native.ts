import * as SQLite from 'expo-sqlite';

import {
  DROP_ALL_TABLES_STATEMENTS,
  MIGRATION_001_STATEMENTS,
} from '@/data/migrations/001_initial';

import { TABLE_MAPPERS } from './mappers';
import type { DatabaseClient, SqlValue, TableName } from './types';
import { SCHEMA_VERSION } from './types';

/** Bumped to escape partially migrated simulator DBs from early boots. */
const DATABASE_NAME = 'agenda.v1.db';

let clientPromise: Promise<DatabaseClient> | null = null;

function quoteIdent(column: string): string {
  if (column === 'date' || column === 'time') {
    return `"${column}"`;
  }
  return column;
}

function buildWhereClause(where: Record<string, SqlValue | undefined>): {
  clause: string;
  values: SqlValue[];
} {
  const entries = Object.entries(where).filter(([, value]) => value !== undefined);
  if (entries.length === 0) {
    return { clause: '', values: [] };
  }

  const parts: string[] = [];
  const values: SqlValue[] = [];

  for (const [key, value] of entries) {
    const column = quoteIdent(camelToSnake(key));
    if (value === null) {
      parts.push(`${column} IS NULL`);
    } else if (value !== undefined) {
      parts.push(`${column} = ?`);
      values.push(value);
    }
  }

  return { clause: ` WHERE ${parts.join(' AND ')}`, values };
}

function camelToSnake(key: string): string {
  const special: Record<string, string> = {
    spaceId: 'space_id',
    isPinned: 'is_pinned',
    isSystem: 'is_system',
    order: 'sort_order',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    completedAt: 'completed_at',
    durationMinutes: 'duration_minutes',
    reminderAt: 'reminder_at',
    deviceEventId: 'device_event_id',
    notificationId: 'notification_id',
    bodyText: 'body_text',
    drawingId: 'drawing_id',
    noteId: 'note_id',
    routineId: 'routine_id',
  };

  return special[key] ?? key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function createSqliteClient(db: SQLite.SQLiteDatabase): DatabaseClient {
  return {
    async getAll<T>(table: TableName): Promise<T[]> {
      const mapper = TABLE_MAPPERS[table];
      const rows = await db.getAllAsync<Record<string, unknown>>(`SELECT * FROM ${table}`);
      return rows.map((row) => mapper.fromRow(row) as T);
    },

    async getById<T>(table: TableName, id: string): Promise<T | null> {
      const mapper = TABLE_MAPPERS[table];
      const idColumn = table === 'meta' ? 'key' : 'id';

      if (table === 'routine_completions') {
        const [routineId, date] = id.split('::');
        const row = await db.getFirstAsync<Record<string, unknown>>(
          'SELECT * FROM routine_completions WHERE routine_id = ? AND "date" = ?',
          routineId,
          date,
        );
        return row ? (mapper.fromRow(row) as T) : null;
      }

      const row = await db.getFirstAsync<Record<string, unknown>>(
        `SELECT * FROM ${table} WHERE ${idColumn} = ?`,
        id,
      );
      return row ? (mapper.fromRow(row) as T) : null;
    },

    async put(table: TableName, record: object): Promise<void> {
      const mapper = TABLE_MAPPERS[table];
      const row = mapper.toRow(record as Record<string, unknown>);
      const columns = mapper.columns.map(quoteIdent);
      const placeholders = columns.map(() => '?').join(', ');
      const values = mapper.columns.map((column) => (row[column] ?? null) as SqlValue);

      await db.runAsync(
        `INSERT OR REPLACE INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
        ...values,
      );
    },

    async delete(table: TableName, id: string): Promise<void> {
      if (table === 'routine_completions') {
        const [routineId, date] = id.split('::');
        await db.runAsync(
          'DELETE FROM routine_completions WHERE routine_id = ? AND "date" = ?',
          routineId,
          date,
        );
        return;
      }

      const idColumn = table === 'meta' ? 'key' : 'id';
      await db.runAsync(`DELETE FROM ${table} WHERE ${idColumn} = ?`, id);
    },

    async findWhere<T>(
      table: TableName,
      where: Record<string, SqlValue | undefined>,
    ): Promise<T[]> {
      const mapper = TABLE_MAPPERS[table];
      const { clause, values } = buildWhereClause(where);
      const rows = await db.getAllAsync<Record<string, unknown>>(
        `SELECT * FROM ${table}${clause}`,
        ...values,
      );
      return rows.map((row) => mapper.fromRow(row) as T);
    },

    async deleteWhere(table: TableName, where: Record<string, SqlValue>): Promise<number> {
      const { clause, values } = buildWhereClause(where);
      if (!clause) {
        return 0;
      }
      const result = await db.runAsync(`DELETE FROM ${table}${clause}`, ...values);
      return result.changes;
    },

    async withTransaction<T>(fn: () => Promise<T>): Promise<T> {
      let result!: T;
      await db.withTransactionAsync(async () => {
        result = await fn();
      });
      return result;
    },

    async getMeta(key: string): Promise<string | null> {
      const row = await db.getFirstAsync<{ value: string }>(
        'SELECT value FROM meta WHERE key = ?',
        key,
      );
      return row?.value ?? null;
    },

    async setMeta(key: string, value: string): Promise<void> {
      await db.runAsync('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', key, value);
    },
  };
}

async function tableExists(db: SQLite.SQLiteDatabase, name: string): Promise<boolean> {
  const row = await db.getFirstAsync<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`,
    name,
  );
  return Boolean(row?.name);
}

async function agendaItemsHasDateColumn(db: SQLite.SQLiteDatabase): Promise<boolean> {
  if (!(await tableExists(db, 'agenda_items'))) {
    return false;
  }

  const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(agenda_items)');
  return columns.some((column) => column.name === 'date');
}

async function resetSchema(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA foreign_keys = OFF;');
  for (const statement of DROP_ALL_TABLES_STATEMENTS) {
    await db.execAsync(statement);
  }
  await db.execAsync('PRAGMA foreign_keys = ON;');
}

async function applyInitialSchema(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`PRAGMA journal_mode = 'wal';`);
  await db.execAsync('PRAGMA foreign_keys = ON;');

  for (const statement of MIGRATION_001_STATEMENTS) {
    await db.execAsync(`${statement};`);
  }
}

async function migrateIfNeeded(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  const hasMeta = await tableExists(db, 'meta');
  const hasDate = await agendaItemsHasDateColumn(db);
  const healthy = hasMeta && hasDate;

  if (!healthy) {
    await resetSchema(db);
    await applyInitialSchema(db);
  } else if (current < SCHEMA_VERSION) {
    const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(agenda_items)');
    const names = new Set(columns.map((column) => column.name));

    if (!names.has('reminder_at')) {
      await db.execAsync('ALTER TABLE agenda_items ADD COLUMN reminder_at TEXT;');
    }
    if (!names.has('device_event_id')) {
      await db.execAsync('ALTER TABLE agenda_items ADD COLUMN device_event_id TEXT;');
    }
    if (!names.has('notification_id')) {
      await db.execAsync('ALTER TABLE agenda_items ADD COLUMN notification_id TEXT;');
    }
  }

  await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
}

export async function openDatabase(): Promise<DatabaseClient> {
  if (!clientPromise) {
    clientPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
      await migrateIfNeeded(db);
      return createSqliteClient(db);
    })();
  }

  return clientPromise;
}

export function getDatabase(): Promise<DatabaseClient> {
  return openDatabase();
}
