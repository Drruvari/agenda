/** Initial SQLite schema (migration 001). */

export const MIGRATION_001_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS spaces (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  icon TEXT,
  is_pinned INTEGER NOT NULL DEFAULT 0,
  is_system INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
)`,
  `CREATE TABLE IF NOT EXISTS agenda_items (
  id TEXT PRIMARY KEY NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('task', 'event', 'note')),
  title TEXT NOT NULL,
  details TEXT,
  space_id TEXT REFERENCES spaces(id) ON DELETE SET NULL,
  priority TEXT NOT NULL DEFAULT 'none',
  "date" TEXT NOT NULL,
  "time" TEXT,
  reminder_at TEXT,
  device_event_id TEXT,
  notification_id TEXT,
  completed INTEGER,
  completed_at TEXT,
  duration_minutes INTEGER,
  recurrence TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
)`,
  `CREATE INDEX IF NOT EXISTS idx_agenda_items_date ON agenda_items("date")`,
  `CREATE INDEX IF NOT EXISTS idx_agenda_items_space ON agenda_items(space_id)`,
  `CREATE INDEX IF NOT EXISTS idx_agenda_items_type ON agenda_items(type)`,
  `CREATE TABLE IF NOT EXISTS routines (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  space_id TEXT REFERENCES spaces(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
)`,
  `CREATE TABLE IF NOT EXISTS routine_completions (
  routine_id TEXT NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  "date" TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  PRIMARY KEY (routine_id, "date")
)`,
  `CREATE TABLE IF NOT EXISTS daily_notes (
  id TEXT PRIMARY KEY NOT NULL,
  "date" TEXT NOT NULL UNIQUE,
  body_text TEXT NOT NULL DEFAULT '',
  drawing_id TEXT,
  updated_at TEXT NOT NULL
)`,
  `CREATE TABLE IF NOT EXISTS drawings (
  id TEXT PRIMARY KEY NOT NULL,
  note_id TEXT NOT NULL REFERENCES daily_notes(id) ON DELETE CASCADE,
  format TEXT NOT NULL DEFAULT 'ink-v1',
  data TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
)`,
  `CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
)`,
];

export const DROP_ALL_TABLES_STATEMENTS: string[] = [
  'DROP TABLE IF EXISTS drawings',
  'DROP TABLE IF EXISTS daily_notes',
  'DROP TABLE IF EXISTS routine_completions',
  'DROP TABLE IF EXISTS routines',
  'DROP TABLE IF EXISTS agenda_items',
  'DROP TABLE IF EXISTS spaces',
  'DROP TABLE IF EXISTS meta',
];
