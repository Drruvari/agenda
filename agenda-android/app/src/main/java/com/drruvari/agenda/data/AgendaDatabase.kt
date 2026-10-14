package com.drruvari.agenda.data

import android.content.ContentValues
import android.content.Context
import android.database.Cursor
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import java.time.Instant
import java.util.UUID

class AgendaDatabase(context: Context) : SQLiteOpenHelper(context, DATABASE_NAME, null, VERSION) {
    override fun onConfigure(db: SQLiteDatabase) { db.setForeignKeyConstraintsEnabled(true) }

    override fun onCreate(db: SQLiteDatabase) { schema.forEach(db::execSQL) }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        // Every migration is additive and idempotent to preserve data from earlier app releases.
        schema.forEach(db::execSQL)
    }

    fun itemsForDate(date: String): List<AgendaItem> = readableDatabase.query(
        "agenda_items", itemColumns, "date = ?", arrayOf(date), null, null,
        "CASE WHEN time IS NULL THEN 0 ELSE 1 END, time, title",
    ).use { cursor -> buildList { while (cursor.moveToNext()) add(cursor.readAgendaItem()) } }

    fun setTaskCompleted(id: String, completed: Boolean) {
        val now = Instant.now().toString()
        val values = ContentValues().apply {
            put("completed", if (completed) 1 else 0)
            if (completed) put("completed_at", now) else putNull("completed_at")
            put("updated_at", now)
        }
        writableDatabase.update("agenda_items", values, "id = ? AND type = 'task'", arrayOf(id))
    }

    fun createItem(title: String, type: AgendaItemType, date: String, time: String?) {
        val now = Instant.now().toString()
        writableDatabase.insertOrThrow("agenda_items", null, ContentValues().apply {
            put("id", UUID.randomUUID().toString()); put("type", type.name.lowercase()); put("title", title.trim())
            put("priority", "none"); put("date", date); if (!time.isNullOrBlank()) put("time", time)
            if (type == AgendaItemType.TASK) put("completed", 0)
            if (type == AgendaItemType.EVENT) put("duration_minutes", 30)
            put("created_at", now); put("updated_at", now)
        })
    }

    fun deleteItem(id: String) { writableDatabase.delete("agenda_items", "id=?", arrayOf(id)) }

    fun search(query: String): List<AgendaItem> = readableDatabase.query(
        "agenda_items", itemColumns, "title LIKE ? OR details LIKE ?", arrayOf("%$query%", "%$query%"), null, null, "date DESC,time,title"
    ).use { cursor -> buildList { while (cursor.moveToNext()) add(cursor.readAgendaItem()) } }

    fun dailyNote(date: String): String = readableDatabase.query("daily_notes", arrayOf("body_text"), "date=?", arrayOf(date), null, null, null)
        .use { if (it.moveToFirst()) it.getString(0) else "" }

    fun saveDailyNote(date: String, body: String) {
        val values = ContentValues().apply { put("id", UUID.randomUUID().toString()); put("date", date); put("body_text", body); put("updated_at", Instant.now().toString()) }
        writableDatabase.insertWithOnConflict("daily_notes", null, values, SQLiteDatabase.CONFLICT_REPLACE)
    }

    private fun Cursor.optionalString(name: String): String? =
        getColumnIndexOrThrow(name).let { if (isNull(it)) null else getString(it) }

    private fun Cursor.readAgendaItem() = AgendaItem(
        id = getString(getColumnIndexOrThrow("id")),
        type = AgendaItemType.valueOf(getString(getColumnIndexOrThrow("type")).uppercase()),
        title = getString(getColumnIndexOrThrow("title")),
        details = optionalString("details"), spaceId = optionalString("space_id"),
        priority = Priority.valueOf(getString(getColumnIndexOrThrow("priority")).uppercase()),
        date = getString(getColumnIndexOrThrow("date")), time = optionalString("time"),
        reminderAt = optionalString("reminder_at"), deviceEventId = optionalString("device_event_id"),
        notificationId = optionalString("notification_id"),
        completed = getColumnIndexOrThrow("completed").let { if (isNull(it)) null else getInt(it) != 0 },
        completedAt = optionalString("completed_at"),
        durationMinutes = getColumnIndexOrThrow("duration_minutes").let { if (isNull(it)) null else getInt(it) },
        recurrence = optionalString("recurrence"), createdAt = getString(getColumnIndexOrThrow("created_at")),
        updatedAt = getString(getColumnIndexOrThrow("updated_at")),
    )

    companion object {
        const val DATABASE_NAME = "agenda.v3.db"
        const val VERSION = 3
        private val itemColumns = arrayOf("id", "type", "title", "details", "space_id", "priority", "date", "time", "reminder_at", "device_event_id", "notification_id", "completed", "completed_at", "duration_minutes", "recurrence", "created_at", "updated_at")
        val schema = listOf(
            "CREATE TABLE IF NOT EXISTS spaces (id TEXT PRIMARY KEY NOT NULL,name TEXT NOT NULL,color TEXT NOT NULL,icon TEXT,is_pinned INTEGER NOT NULL DEFAULT 0,is_system INTEGER NOT NULL DEFAULT 0,sort_order INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL)",
            "CREATE TABLE IF NOT EXISTS agenda_items (id TEXT PRIMARY KEY NOT NULL,type TEXT NOT NULL CHECK(type IN ('task','event','note')),title TEXT NOT NULL,details TEXT,space_id TEXT REFERENCES spaces(id) ON DELETE SET NULL,priority TEXT NOT NULL DEFAULT 'none',date TEXT NOT NULL,time TEXT,reminder_at TEXT,device_event_id TEXT,notification_id TEXT,completed INTEGER,completed_at TEXT,duration_minutes INTEGER,recurrence TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)",
            "CREATE INDEX IF NOT EXISTS idx_agenda_items_date ON agenda_items(date)",
            "CREATE INDEX IF NOT EXISTS idx_agenda_items_space ON agenda_items(space_id)",
            "CREATE INDEX IF NOT EXISTS idx_agenda_items_type ON agenda_items(type)",
            "CREATE TABLE IF NOT EXISTS routines (id TEXT PRIMARY KEY NOT NULL,name TEXT NOT NULL,space_id TEXT REFERENCES spaces(id) ON DELETE SET NULL,sort_order INTEGER NOT NULL DEFAULT 0,active INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)",
            "CREATE TABLE IF NOT EXISTS routine_completions (routine_id TEXT NOT NULL REFERENCES routines(id) ON DELETE CASCADE,date TEXT NOT NULL,completed_at TEXT NOT NULL,PRIMARY KEY(routine_id,date))",
            "CREATE TABLE IF NOT EXISTS daily_notes (id TEXT PRIMARY KEY NOT NULL,date TEXT NOT NULL UNIQUE,body_text TEXT NOT NULL DEFAULT '',drawing_id TEXT,updated_at TEXT NOT NULL)",
            "CREATE TABLE IF NOT EXISTS drawings (id TEXT PRIMARY KEY NOT NULL,note_id TEXT NOT NULL REFERENCES daily_notes(id) ON DELETE CASCADE,format TEXT NOT NULL DEFAULT 'ink-v1',data TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)",
            "CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY NOT NULL,value TEXT NOT NULL)",
            "CREATE TABLE IF NOT EXISTS note_drafts (date TEXT PRIMARY KEY NOT NULL,body_text TEXT NOT NULL DEFAULT '',base_updated_at TEXT NOT NULL,updated_at TEXT NOT NULL)",
            "CREATE TABLE IF NOT EXISTS daily_page_blocks (id TEXT PRIMARY KEY NOT NULL,note_id TEXT NOT NULL REFERENCES daily_notes(id) ON DELETE CASCADE,position INTEGER NOT NULL,type TEXT NOT NULL CHECK(type IN ('text','ink')),text TEXT,drawing_id TEXT REFERENCES drawings(id) ON DELETE CASCADE,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)",
            "CREATE INDEX IF NOT EXISTS idx_daily_page_blocks_note_position ON daily_page_blocks(note_id,position)",
        )
    }
}
