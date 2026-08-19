import type { DatabaseClient, SqlValue, TableName } from './types';
import { SCHEMA_VERSION } from './types';

const DATABASE_NAME = 'agenda';

const STORE_NAMES: TableName[] = [
  'spaces',
  'agenda_items',
  'routines',
  'routine_completions',
  'daily_notes',
  'daily_page_blocks',
  'note_drafts',
  'drawings',
  'meta',
];

let clientPromise: Promise<DatabaseClient> | null = null;

function openIndexedDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, SCHEMA_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      for (const table of STORE_NAMES) {
        if (db.objectStoreNames.contains(table)) {
          continue;
        }

        switch (table) {
          case 'routine_completions': {
            const store = db.createObjectStore(table, { keyPath: ['routineId', 'date'] });
            store.createIndex('by_date', 'date', { unique: false });
            store.createIndex('by_routine', 'routineId', { unique: false });
            break;
          }

          case 'meta':
            db.createObjectStore(table, { keyPath: 'key' });
            break;

          case 'daily_notes': {
            const store = db.createObjectStore(table, { keyPath: 'id' });
            store.createIndex('by_date', 'date', { unique: true });
            break;
          }

          case 'note_drafts':
            db.createObjectStore(table, { keyPath: 'date' });
            break;

          case 'agenda_items': {
            const store = db.createObjectStore(table, { keyPath: 'id' });
            store.createIndex('by_date', 'date', { unique: false });
            store.createIndex('by_space', 'spaceId', { unique: false });
            break;
          }

          default:
            db.createObjectStore(table, { keyPath: 'id' });
        }
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error ?? new Error('Failed to open IndexedDB'));
    };
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error ?? new Error('IndexedDB request failed'));
    };
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = () => {
      reject(transaction.error ?? new Error('IndexedDB transaction failed'));
    };

    transaction.onabort = () => {
      reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
    };
  });
}

function matchesWhere(
  record: Record<string, unknown>,
  where: Record<string, SqlValue | undefined>,
): boolean {
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

function keyFromId(table: TableName, id: string): IDBValidKey {
  if (table === 'routine_completions') {
    const [routineId, date] = id.split('::');
    return [routineId ?? '', date ?? ''];
  }

  return id;
}

function keyFromRecord(table: TableName, record: Record<string, unknown>): IDBValidKey {
  switch (table) {
    case 'routine_completions':
      return [record.routineId as string, record.date as string];

    case 'meta':
      return record.key as string;

    case 'note_drafts':
      return record.date as string;

    default:
      return record.id as string;
  }
}

function createIndexedDbClient(db: IDBDatabase): DatabaseClient {
  let activeTransaction: IDBTransaction | null = null;

  async function withStore<T>(
    table: TableName,
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => Promise<T>,
  ): Promise<T> {
    if (activeTransaction) {
      return operation(activeTransaction.objectStore(table));
    }

    const transaction = db.transaction(table, mode);
    const done = transactionDone(transaction);

    try {
      const result = await operation(transaction.objectStore(table));
      await done;
      return result;
    } catch (error) {
      await done.catch(() => undefined);
      throw error;
    }
  }

  async function getAll<T>(table: TableName): Promise<T[]> {
    return withStore(table, 'readonly', async (store) => {
      const rows = await requestToPromise(store.getAll());
      return rows as T[];
    });
  }

  async function getById<T>(table: TableName, id: string): Promise<T | null> {
    return withStore(table, 'readonly', async (store) => {
      const row = await requestToPromise(store.get(keyFromId(table, id)));
      return (row as T | undefined) ?? null;
    });
  }

  async function put(table: TableName, record: object): Promise<void> {
    await withStore(table, 'readwrite', async (store) => {
      await requestToPromise(store.put(record));
    });
  }

  async function deleteRecord(table: TableName, id: string): Promise<void> {
    await withStore(table, 'readwrite', async (store) => {
      await requestToPromise(store.delete(keyFromId(table, id)));
    });
  }

  async function findWhere<T>(
    table: TableName,
    where: Record<string, SqlValue | undefined>,
  ): Promise<T[]> {
    const records = await getAll<Record<string, unknown>>(table);
    return records.filter((record) => matchesWhere(record, where)) as T[];
  }

  async function deleteWhere(table: TableName, where: Record<string, SqlValue>): Promise<number> {
    return withStore(table, 'readwrite', async (store) => {
      const records = (await requestToPromise(store.getAll())) as Record<string, unknown>[];
      const matches = records.filter((record) => matchesWhere(record, where));

      for (const record of matches) {
        await requestToPromise(store.delete(keyFromRecord(table, record)));
      }

      return matches.length;
    });
  }

  async function putDailyNoteIfUpdatedAtMatches(
    note: Parameters<DatabaseClient['putDailyNoteIfUpdatedAtMatches']>[0],
    expectedUpdatedAt: string,
  ): Promise<boolean> {
    return withStore('daily_notes', 'readwrite', async (store) => {
      const current = (await requestToPromise(store.get(note.id))) as
        { updatedAt?: string } | undefined;

      if (current?.updatedAt !== expectedUpdatedAt) {
        return false;
      }

      await requestToPromise(store.put(note));
      return true;
    });
  }

  async function withTransaction<T>(operation: () => Promise<T>): Promise<T> {
    if (activeTransaction) {
      throw new Error('Nested database transactions are not supported');
    }

    const transaction = db.transaction(STORE_NAMES, 'readwrite');
    const done = transactionDone(transaction);
    activeTransaction = transaction;

    try {
      const result = await operation();
      await done;
      return result;
    } catch (error) {
      try {
        transaction.abort();
      } catch {
        // Ignore abort failures on an already-failed transaction.
      }

      await done.catch(() => undefined);
      throw error;
    } finally {
      activeTransaction = null;
    }
  }

  async function getMeta(key: string): Promise<string | null> {
    const row = await getById<{ key: string; value: string }>('meta', key);
    return row?.value ?? null;
  }

  async function setMeta(key: string, value: string): Promise<void> {
    await put('meta', { key, value });
  }

  return {
    getAll,
    getById,
    put,
    delete: deleteRecord,
    findWhere,
    deleteWhere,
    putDailyNoteIfUpdatedAtMatches,
    withTransaction,
    getMeta,
    setMeta,
  };
}

async function createDatabaseClient(): Promise<DatabaseClient> {
  const db = await openIndexedDb();
  return createIndexedDbClient(db);
}

export function openDatabase(): Promise<DatabaseClient> {
  if (!clientPromise) {
    clientPromise = createDatabaseClient().catch((error) => {
      clientPromise = null;
      throw error;
    });
  }

  return clientPromise;
}

export function getDatabase(): Promise<DatabaseClient> {
  return openDatabase();
}
