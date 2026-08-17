export const MIGRATION_002_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS note_drafts (
  "date" TEXT PRIMARY KEY NOT NULL,
  body_text TEXT NOT NULL DEFAULT '',
  base_updated_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
)`,
];
