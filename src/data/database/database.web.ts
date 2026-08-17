import type { DatabaseClient, SqlValue, TableName } from './types';
import { SCHEMA_VERSION } from './types';

const DB_NAME = 'agenda';

const STORE_NAMES: TableName[] = [
  'spaces',
  'agenda_items',
  'routines',
  'routine_completions',
  'daily_notes',
  'note_drafts',
  'drawings',
  'meta',
];

let clientPromise: Promise<DatabaseClient> | null = null;

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, SCHEMA_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      for (const name of STORE_NAMES) {
        if (db.objectStoreNames.contains(name)) {
          continue;
        }

        if (name === 'routine_completions') {
          const store = db.createObjectStore(name, { keyPath: ['routineId', 'date'] });
          store.createIndex('by_date', 'date', { unique: false });
          store.createIndex('by_routine', 'routineId', { unique: false });
          continue;
        }

        if (name === 'meta') {
          db.createObjectStore(name, { keyPath: 'key' });
          continue;
        }

        if (name === 'daily_notes') {
          const store = db.createObjectStore(name, { keyPath: 'id' });
          store.createIndex('by_date', 'date', { unique: true });
          continue;
        }

        if (name === 'note_drafts') {
          db.createObjectStore(name, { keyPath: 'date' });
          continue;
        }

        if (name === 'agenda_items') {
          const store = db.createObjectStore(name, { keyPath: 'id' });
          store.createIndex('by_date', 'date', { unique: false });
          store.createIndex('by_space', 'spaceId', { unique: false });
          continue;
        }

        db.createObjectStore(name, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
  });
}

function matchesWhere(
  record: Record<string, unknown>,
  where: Record<string, SqlValue | undefined>,
) {
  return Object.entries(where).every(([key, expected]) => {
    if (expected === undefined) {
      return true;
    }
    const actual = record[key];
    if (expected === null) {
      return actual == null;
    }
    return actual === expected;
  });
}

function createIndexedDbClient(db: IDBDatabase): DatabaseClient {
  let activeTransaction: IDBTransaction | null = null;

  const getTransaction = (table: TableName, mode: IDBTransactionMode) => {
    if (activeTransaction) {
      return { owned: false, tx: activeTransaction };
    }
    return { owned: true, tx: db.transaction(table, mode) };
  };

  return {
    async getAll<T>(table: TableName): Promise<T[]> {
      const { owned, tx } = getTransaction(table, 'readonly');
      const store = tx.objectStore(table);
      const rows = await requestToPromise(store.getAll());
      if (owned) await transactionDone(tx);
      return rows as T[];
    },

    async getById<T>(table: TableName, id: string): Promise<T | null> {
      const { owned, tx } = getTransaction(table, 'readonly');
      const store = tx.objectStore(table);

      let key: IDBValidKey = id;
      if (table === 'routine_completions') {
        const [routineId, date] = id.split('::');
        key = [routineId, date];
      }

      const row = await requestToPromise(store.get(key));
      if (owned) await transactionDone(tx);
      return (row as T) ?? null;
    },

    async put(table: TableName, record: object): Promise<void> {
      const { owned, tx } = getTransaction(table, 'readwrite');
      const store = tx.objectStore(table);
      await requestToPromise(store.put(record));
      if (owned) await transactionDone(tx);
    },

    async delete(table: TableName, id: string): Promise<void> {
      const { owned, tx } = getTransaction(table, 'readwrite');
      const store = tx.objectStore(table);

      let key: IDBValidKey = id;
      if (table === 'routine_completions') {
        const [routineId, date] = id.split('::');
        key = [routineId, date];
      }

      await requestToPromise(store.delete(key));
      if (owned) await transactionDone(tx);
    },

    async findWhere<T>(
      table: TableName,
      where: Record<string, SqlValue | undefined>,
    ): Promise<T[]> {
      const all = await this.getAll<Record<string, unknown>>(table);
      return all.filter((record) => matchesWhere(record, where)) as T[];
    },

    async deleteWhere(table: TableName, where: Record<string, SqlValue>): Promise<number> {
      const matches = await this.findWhere<Record<string, unknown>>(table, where);
      const { owned, tx } = getTransaction(table, 'readwrite');
      const store = tx.objectStore(table);

      for (const record of matches) {
        if (table === 'routine_completions') {
          await requestToPromise(store.delete([record.routineId as string, record.date as string]));
        } else if (table === 'meta') {
          await requestToPromise(store.delete(record.key as string));
        } else if (table === 'note_drafts') {
          await requestToPromise(store.delete(record.date as string));
        } else {
          await requestToPromise(store.delete(record.id as string));
        }
      }

      if (owned) await transactionDone(tx);
      return matches.length;
    },

    async putDailyNoteIfUpdatedAtMatches(note, expectedUpdatedAt): Promise<boolean> {
      const { owned, tx } = getTransaction('daily_notes', 'readwrite');
      const store = tx.objectStore('daily_notes');
      const current = (await requestToPromise(store.get(note.id))) as
        { updatedAt?: string } | undefined;

      if (current?.updatedAt !== expectedUpdatedAt) {
        if (owned) await transactionDone(tx);
        return false;
      }

      await requestToPromise(store.put(note));
      if (owned) await transactionDone(tx);
      return true;
    },

    async withTransaction<T>(fn: () => Promise<T>): Promise<T> {
      if (activeTransaction) {
        throw new Error('Nested database transactions are not supported');
      }

      const tx = db.transaction(STORE_NAMES, 'readwrite');
      activeTransaction = tx;
      try {
        const result = await fn();
        await transactionDone(tx);
        return result;
      } catch (error) {
        try {
          tx.abort();
        } catch {
          // Ignore
        }
        throw error;
      } finally {
        activeTransaction = null;
      }
    },

    async getMeta(key: string): Promise<string | null> {
      const row = await this.getById<{ key: string; value: string }>('meta', key);
      return row?.value ?? null;
    },

    async setMeta(key: string, value: string): Promise<void> {
      await this.put('meta', { key, value });
    },
  };
}

export async function openDatabase(): Promise<DatabaseClient> {
  if (!clientPromise) {
    clientPromise = (async () => {
      const db = await openIdb();
      return createIndexedDbClient(db);
    })();
  }

  return clientPromise;
}

export function getDatabase(): Promise<DatabaseClient> {
  return openDatabase();
}
