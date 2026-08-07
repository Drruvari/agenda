import type { DatabaseClient, SqlValue, TableName } from '@/data/database/types';
import { compoundKey } from '@/data/database/mappers';

/** In-memory DatabaseClient for unit tests (no SQLite / IndexedDB). */
export function createMemoryDatabase(): DatabaseClient {
  const stores = new Map<TableName, Map<string, Record<string, unknown>>>();

  const ensure = (table: TableName) => {
    let store = stores.get(table);
    if (!store) {
      store = new Map();
      stores.set(table, store);
    }
    return store;
  };

  const client: DatabaseClient = {
    async getAll<T>(table: TableName): Promise<T[]> {
      return [...ensure(table).values()] as T[];
    },

    async getById<T>(table: TableName, id: string): Promise<T | null> {
      return (ensure(table).get(id) as T) ?? null;
    },

    async put(table: TableName, record: object): Promise<void> {
      const row = record as Record<string, unknown>;
      ensure(table).set(compoundKey(table, row), { ...row });
    },

    async delete(table: TableName, id: string): Promise<void> {
      ensure(table).delete(id);
    },

    async findWhere<T>(
      table: TableName,
      where: Record<string, SqlValue | undefined>,
    ): Promise<T[]> {
      return [...ensure(table).values()].filter((record) =>
        Object.entries(where).every(([key, expected]) => {
          if (expected === undefined) return true;
          const actual = record[key];
          if (expected === null) return actual == null;
          return actual === expected;
        }),
      ) as T[];
    },

    async deleteWhere(table: TableName, where: Record<string, SqlValue>): Promise<number> {
      const matches = await client.findWhere<Record<string, unknown>>(table, where);
      const store = ensure(table);
      for (const record of matches) {
        store.delete(compoundKey(table, record));
      }
      return matches.length;
    },

    async withTransaction<T>(fn: () => Promise<T>): Promise<T> {
      return fn();
    },

    async getMeta(key: string): Promise<string | null> {
      const row = await client.getById<{ key: string; value: string }>('meta', key);
      return row?.value ?? null;
    },

    async setMeta(key: string, value: string): Promise<void> {
      await client.put('meta', { key, value });
    },
  };

  return client;
}
