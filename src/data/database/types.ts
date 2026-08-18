import type { DailyNote } from '@/data/schema/types';

export type TableName =
  | 'spaces'
  | 'agenda_items'
  | 'routines'
  | 'routine_completions'
  | 'daily_notes'
  | 'daily_page_blocks'
  | 'note_drafts'
  | 'drawings'
  | 'meta';

export type SqlValue = string | number | null;

export interface DatabaseClient {
  getAll<T>(table: TableName): Promise<T[]>;
  getById<T>(table: TableName, id: string): Promise<T | null>;
  put(table: TableName, record: object): Promise<void>;
  delete(table: TableName, id: string): Promise<void>;
  findWhere<T>(table: TableName, where: Record<string, SqlValue | undefined>): Promise<T[]>;
  deleteWhere(table: TableName, where: Record<string, SqlValue>): Promise<number>;
  putDailyNoteIfUpdatedAtMatches(note: DailyNote, expectedUpdatedAt: string): Promise<boolean>;
  withTransaction<T>(fn: () => Promise<T>): Promise<T>;
  getMeta(key: string): Promise<string | null>;
  setMeta(key: string, value: string): Promise<void>;
}

export const SCHEMA_VERSION = 4;
