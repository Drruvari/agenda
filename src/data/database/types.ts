export type TableName =
  | 'spaces'
  | 'agenda_items'
  | 'routines'
  | 'routine_completions'
  | 'daily_notes'
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
  withTransaction<T>(fn: () => Promise<T>): Promise<T>;
  getMeta(key: string): Promise<string | null>;
  setMeta(key: string, value: string): Promise<void>;
}

export const SCHEMA_VERSION = 2;
