export const MIGRATION_003_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS daily_page_blocks (
  id TEXT PRIMARY KEY NOT NULL,
  note_id TEXT NOT NULL REFERENCES daily_notes(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('text', 'ink')),
  text TEXT,
  drawing_id TEXT REFERENCES drawings(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
)`,
  `CREATE INDEX IF NOT EXISTS idx_daily_page_blocks_note_position
  ON daily_page_blocks(note_id, position)`,
];
