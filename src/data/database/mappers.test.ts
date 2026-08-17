import { describe, expect, it } from 'vitest';

import { buildUpsertSql } from './mappers';

describe('buildUpsertSql', () => {
  it('updates routines without SQLite REPLACE semantics', () => {
    const sql = buildUpsertSql('routines');

    expect(sql).toContain('ON CONFLICT (id) DO UPDATE SET');
    expect(sql).not.toContain('REPLACE');
    expect(sql).not.toContain('id = excluded.id');
  });

  it('uses the full routine completion key', () => {
    const sql = buildUpsertSql('routine_completions');

    expect(sql).toContain('ON CONFLICT (routine_id, "date") DO UPDATE SET');
    expect(sql).toContain('completed_at = excluded.completed_at');
  });

  it('updates daily notes by id without replacing the parent row', () => {
    const sql = buildUpsertSql('daily_notes');

    expect(sql).toContain('ON CONFLICT (id) DO UPDATE SET');
    expect(sql).toContain('drawing_id = excluded.drawing_id');
    expect(sql).not.toContain('REPLACE');
  });
});
