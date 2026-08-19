import * as SQLite from 'expo-sqlite';

import { MIGRATION_001_STATEMENTS } from '@/data/migrations/001_initial';
import { MIGRATION_002_STATEMENTS } from '@/data/migrations/002_note_drafts';
import { MIGRATION_003_STATEMENTS } from '@/data/migrations/003_daily_page_blocks';

import { buildUpsertSql, TABLE_MAPPERS } from './mappers';
import type { DatabaseClient, SqlValue, TableName } from './types';
import { SCHEMA_VERSION } from './types';

const DATABASE_NAME = 'agenda.v3.db';
const LEGACY_DATABASE_NAMES = ['agenda.v1.db'] as const;

const USER_DATA_TABLES: readonly TableName[] = [
  'spaces',
  'agenda_items',
  'routines',
  'routine_completions',
  'daily_notes',
  'daily_page_blocks',
  'note_drafts',
  'drawings',
];

const TABLE_COPY_ORDER: readonly TableName[] = [
  'spaces',
  'agenda_items',
  'routines',
  'routine_completions',
  'daily_notes',
  'note_drafts',
  'drawings',
  'daily_page_blocks',
  'meta',
];

let clientPromise: Promise<DatabaseClient> | null = null;
let sqliteDb: SQLite.SQLiteDatabase | null = null;

function quoteIdentifier(column: string): string {
  return column === 'date' || column === 'time' ? `"${column}"` : column;
}

function columnName(key: string): string {
  if (key === 'order') {
    return 'sort_order';
  }

  return key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function buildWhereClause(where: Record<string, SqlValue | undefined>): {
  clause: string;
  values: SqlValue[];
} {
  const entries = Object.entries(where).filter(([, value]) => value !== undefined);

  if (entries.length === 0) {
    return { clause: '', values: [] };
  }

  const conditions: string[] = [];
  const values: SqlValue[] = [];

  for (const [key, value] of entries) {
    const column = quoteIdentifier(columnName(key));

    if (value === null) {
      conditions.push(`${column} IS NULL`);
      continue;
    }

    if (value === undefined) {
      continue;
    }

    conditions.push(`${column} = ?`);
    values.push(value);
  }

  return {
    clause: ` WHERE ${conditions.join(' AND ')}`,
    values,
  };
}

function idColumn(table: TableName): string {
  switch (table) {
    case 'meta':
      return 'key';

    case 'note_drafts':
      return '"date"';

    default:
      return 'id';
  }
}

function splitRoutineCompletionId(id: string): [string, string] {
  const [routineId = '', date = ''] = id.split('::');
  return [routineId, date];
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

      if (table === 'routine_completions') {
        const [routineId, date] = splitRoutineCompletionId(id);
        const row = await db.getFirstAsync<Record<string, unknown>>(
          `SELECT *
           FROM routine_completions
           WHERE routine_id = ?
             AND "date" = ?`,
          routineId,
          date,
        );

        return row ? (mapper.fromRow(row) as T) : null;
      }

      const row = await db.getFirstAsync<Record<string, unknown>>(
        `SELECT *
         FROM ${table}
         WHERE ${idColumn(table)} = ?`,
        id,
      );

      return row ? (mapper.fromRow(row) as T) : null;
    },

    async put(table: TableName, record: object): Promise<void> {
      const mapper = TABLE_MAPPERS[table];
      const row = mapper.toRow(record as Record<string, unknown>);
      const values = mapper.columns.map((column) => (row[column] ?? null) as SqlValue);
      await db.runAsync(buildUpsertSql(table), ...values);
    },

    async delete(table: TableName, id: string): Promise<void> {
      if (table === 'routine_completions') {
        const [routineId, date] = splitRoutineCompletionId(id);
        await db.runAsync(
          `DELETE FROM routine_completions
           WHERE routine_id = ?
             AND "date" = ?`,
          routineId,
          date,
        );
        return;
      }

      await db.runAsync(
        `DELETE FROM ${table}
         WHERE ${idColumn(table)} = ?`,
        id,
      );
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

    async putDailyNoteIfUpdatedAtMatches(note, expectedUpdatedAt): Promise<boolean> {
      const row = TABLE_MAPPERS.daily_notes.toRow(note as unknown as Record<string, unknown>);
      const result = await db.runAsync(
        `UPDATE daily_notes
         SET "date" = ?,
             body_text = ?,
             drawing_id = ?,
             updated_at = ?
         WHERE id = ?
           AND updated_at = ?`,
        row.date as SqlValue,
        row.body_text as SqlValue,
        (row.drawing_id ?? null) as SqlValue,
        row.updated_at as SqlValue,
        row.id as SqlValue,
        expectedUpdatedAt,
      );

      return result.changes === 1;
    },

    async withTransaction<T>(operation: () => Promise<T>): Promise<T> {
      let result!: T;

      await db.withTransactionAsync(async () => {
        result = await operation();
      });

      return result;
    },

    async getMeta(key: string): Promise<string | null> {
      const row = await db.getFirstAsync<{ value: string }>(
        `SELECT value
         FROM meta
         WHERE key = ?`,
        key,
      );

      return row?.value ?? null;
    },

    async setMeta(key: string, value: string): Promise<void> {
      await db.runAsync(
        `INSERT INTO meta (key, value)
         VALUES (?, ?)
         ON CONFLICT (key)
         DO UPDATE
         SET value = excluded.value`,
        key,
        value,
      );
    },
  };
}

async function tableExists(db: SQLite.SQLiteDatabase, name: string): Promise<boolean> {
  const row = await db.getFirstAsync<{ name: string }>(
    `SELECT name
     FROM sqlite_master
     WHERE type = 'table'
       AND name = ?`,
    name,
  );

  return Boolean(row?.name);
}

async function getTableColumns(db: SQLite.SQLiteDatabase, table: string): Promise<Set<string>> {
  const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  return new Set(columns.map((column) => column.name));
}

async function agendaItemsHasDateColumn(db: SQLite.SQLiteDatabase): Promise<boolean> {
  if (!(await tableExists(db, 'agenda_items'))) {
    return false;
  }

  const columns = await getTableColumns(db, 'agenda_items');
  return columns.has('date');
}

async function configureDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`PRAGMA journal_mode = 'wal';`);
  await db.execAsync('PRAGMA foreign_keys = ON;');
}

async function runStatements(
  db: SQLite.SQLiteDatabase,
  statements: readonly string[],
): Promise<void> {
  for (const statement of statements) {
    await db.execAsync(`${statement};`);
  }
}

async function applyInitialSchema(db: SQLite.SQLiteDatabase): Promise<void> {
  await configureDatabase(db);
  await runStatements(db, MIGRATION_001_STATEMENTS);
  await runStatements(db, MIGRATION_002_STATEMENTS);
  await runStatements(db, MIGRATION_003_STATEMENTS);
}

async function hasApplicationTables(db: SQLite.SQLiteDatabase): Promise<boolean> {
  const row = await db.getFirstAsync<{ name: string }>(
    `SELECT name
     FROM sqlite_master
     WHERE type = 'table'
       AND name NOT LIKE 'sqlite_%'
     LIMIT 1`,
  );

  return Boolean(row?.name);
}

async function hasUserData(db: SQLite.SQLiteDatabase): Promise<boolean> {
  for (const table of USER_DATA_TABLES) {
    if (!(await tableExists(db, table))) {
      continue;
    }

    const row = await db.getFirstAsync<{ count: number }>(`SELECT COUNT(*) AS count FROM ${table}`);

    if ((row?.count ?? 0) > 0) {
      return true;
    }
  }

  return false;
}

async function migrateVersionOne(db: SQLite.SQLiteDatabase): Promise<void> {
  const columns = await getTableColumns(db, 'agenda_items');

  if (!columns.has('reminder_at')) {
    await db.execAsync('ALTER TABLE agenda_items ADD COLUMN reminder_at TEXT;');
  }

  if (!columns.has('device_event_id')) {
    await db.execAsync('ALTER TABLE agenda_items ADD COLUMN device_event_id TEXT;');
  }

  if (!columns.has('notification_id')) {
    await db.execAsync('ALTER TABLE agenda_items ADD COLUMN notification_id TEXT;');
  }
}

async function migrateIfNeeded(db: SQLite.SQLiteDatabase): Promise<void> {
  await configureDatabase(db);

  const versionRow = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = versionRow?.user_version ?? 0;

  if (currentVersion > SCHEMA_VERSION) {
    throw new Error(
      `Agenda database schema ${currentVersion} is newer than supported schema ${SCHEMA_VERSION}`,
    );
  }

  const hasTables = await hasApplicationTables(db);

  if (!hasTables) {
    await applyInitialSchema(db);
  } else {
    const healthy = (await tableExists(db, 'meta')) && (await agendaItemsHasDateColumn(db));

    if (!healthy) {
      throw new Error(
        'Agenda database schema is incomplete or unsupported. The database was left unchanged.',
      );
    }

    if (currentVersion < 2) {
      await migrateVersionOne(db);
    }

    if (currentVersion < 3 || !(await tableExists(db, 'note_drafts'))) {
      await runStatements(db, MIGRATION_002_STATEMENTS);
    }

    if (currentVersion < 4 || !(await tableExists(db, 'daily_page_blocks'))) {
      await runStatements(db, MIGRATION_003_STATEMENTS);
    }
  }

  await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
}

async function importLegacyDatabaseIfNeeded(db: SQLite.SQLiteDatabase): Promise<boolean> {
  if (await hasApplicationTables(db)) {
    const healthy = (await tableExists(db, 'meta')) && (await agendaItemsHasDateColumn(db));

    if (!healthy || (await hasUserData(db))) {
      return false;
    }
  }

  for (const name of LEGACY_DATABASE_NAMES) {
    const legacyDb = await SQLite.openDatabaseAsync(name);

    try {
      if (!(await hasApplicationTables(legacyDb))) {
        continue;
      }

      await migrateIfNeeded(legacyDb);
      await applyInitialSchema(db);

      const source = createSqliteClient(legacyDb);
      const target = createSqliteClient(db);

      await db.withTransactionAsync(async () => {
        for (const table of TABLE_COPY_ORDER) {
          const records = await source.getAll<Record<string, unknown>>(table);

          for (const record of records) {
            await target.put(table, record);
          }
        }
      });

      return true;
    } finally {
      await legacyDb.closeAsync();
    }
  }

  return false;
}

async function createDatabaseClient(): Promise<DatabaseClient> {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);

  try {
    await importLegacyDatabaseIfNeeded(db);
    await migrateIfNeeded(db);
    sqliteDb = db;
    return createSqliteClient(db);
  } catch (error) {
    await db.closeAsync().catch(() => undefined);
    throw error;
  }
}

export async function openDatabase(): Promise<DatabaseClient> {
  if (!clientPromise) {
    clientPromise = createDatabaseClient().catch((error) => {
      clientPromise = null;
      sqliteDb = null;
      throw error;
    });
  } else if (sqliteDb) {
    await migrateIfNeeded(sqliteDb);
  }

  return clientPromise;
}

export function getDatabase(): Promise<DatabaseClient> {
  return openDatabase();
}
