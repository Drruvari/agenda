import { describe, expect, it } from 'vitest';

import { createMemoryDatabase } from './memory';

describe('memory database transactions', () => {
  it('rolls back writes when the transaction fails', async () => {
    const db = createMemoryDatabase();
    await db.put('meta', { key: 'before', value: 'kept' });

    await expect(
      db.withTransaction(async () => {
        await db.put('meta', { key: 'during', value: 'removed' });
        throw new Error('stop');
      }),
    ).rejects.toThrow('stop');

    expect(await db.getById<{ key: string; value: string }>('meta', 'before')).toEqual({
      key: 'before',
      value: 'kept',
    });
    expect(await db.getById('meta', 'during')).toBeNull();
  });
});
