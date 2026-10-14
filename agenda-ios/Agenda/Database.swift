import Foundation
import SQLite3

private let SQLITE_TRANSIENT = unsafeBitCast(-1, to: sqlite3_destructor_type.self)

enum DatabaseError: Error, LocalizedError {
    case open(String), execute(String), prepare(String)
    var errorDescription: String? {
        switch self {
        case .open(let value), .execute(let value), .prepare(let value): value
        }
    }
}

actor AgendaDatabase {
    static let filename = "agenda.v3.db"
    static let schemaVersion = 4
    private var handle: OpaquePointer?

    init(url: URL? = nil) throws {
        let resolved = try url ?? Self.databaseURL()
        if sqlite3_open_v2(resolved.path, &handle, SQLITE_OPEN_CREATE | SQLITE_OPEN_READWRITE | SQLITE_OPEN_FULLMUTEX, nil) != SQLITE_OK {
            throw DatabaseError.open("Could not open \(resolved.lastPathComponent)")
        }
        try Self.execute(handle, "PRAGMA journal_mode = WAL")
        try Self.execute(handle, "PRAGMA foreign_keys = ON")
        try Self.migrate(handle)
    }

    /// This is the database location used by earlier app releases. Keeping it allows an App Store
    /// update with the same bundle identity to open the existing database without copying it.
    private static func databaseURL() throws -> URL {
        let manager = FileManager.default
        let documents = try manager.url(for: .documentDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
        let directory = documents.appendingPathComponent("SQLite", isDirectory: true)
        try manager.createDirectory(at: directory, withIntermediateDirectories: true)
        return directory.appendingPathComponent(filename)
    }

    private static func execute(_ handle: OpaquePointer?, _ sql: String) throws {
        var error: UnsafeMutablePointer<CChar>?
        guard sqlite3_exec(handle, sql, nil, nil, &error) == SQLITE_OK else {
            let message = error.map { String(cString: $0) } ?? "SQLite error"
            sqlite3_free(error)
            throw DatabaseError.execute(message)
        }
    }

    private static func migrate(_ handle: OpaquePointer?) throws {
        let current = userVersion(handle)
        guard current <= schemaVersion else {
            throw DatabaseError.open("Agenda database schema \(current) is newer than this app supports (\(schemaVersion)). The database was left unchanged.")
        }
        try execute(handle, "BEGIN IMMEDIATE")
        do {
            if current < 1 { for statement in migration1 { try execute(handle, statement) } }
            if current < 2 {
                try addColumn("reminder_at", definition: "TEXT", to: "agenda_items", handle: handle)
                try addColumn("device_event_id", definition: "TEXT", to: "agenda_items", handle: handle)
                try addColumn("notification_id", definition: "TEXT", to: "agenda_items", handle: handle)
            }
            if current < 3 { for statement in migration3 { try execute(handle, statement) } }
            if current < 4 { for statement in migration4 { try execute(handle, statement) } }
            try execute(handle, "PRAGMA user_version = \(schemaVersion)")
            try execute(handle, "COMMIT")
        } catch {
            try? execute(handle, "ROLLBACK")
            throw error
        }
    }

    private static func userVersion(_ handle: OpaquePointer?) -> Int {
        var statement: OpaquePointer?
        defer { sqlite3_finalize(statement) }
        guard sqlite3_prepare_v2(handle, "PRAGMA user_version", -1, &statement, nil) == SQLITE_OK,
              sqlite3_step(statement) == SQLITE_ROW else { return 0 }
        return Int(sqlite3_column_int(statement, 0))
    }

    private static func addColumn(_ name: String, definition: String, to table: String, handle: OpaquePointer?) throws {
        var statement: OpaquePointer?
        defer { sqlite3_finalize(statement) }
        guard sqlite3_prepare_v2(handle, "PRAGMA table_info(\(table))", -1, &statement, nil) == SQLITE_OK else { throw DatabaseError.prepare("Could not inspect \(table)") }
        while sqlite3_step(statement) == SQLITE_ROW {
            if let raw = sqlite3_column_text(statement, 1), String(cString: raw) == name { return }
        }
        try execute(handle, "ALTER TABLE \(table) ADD COLUMN \(name) \(definition)")
    }

    func items(for date: String) throws -> [AgendaItem] {
        let sql = """
        SELECT id,type,title,details,space_id,priority,date,time,reminder_at,device_event_id,
               notification_id,completed,completed_at,duration_minutes,recurrence,created_at,updated_at
        FROM agenda_items WHERE date = ?
        ORDER BY CASE WHEN time IS NULL THEN 0 ELSE 1 END, time, title
        """
        let statement = try prepare(sql)
        defer { sqlite3_finalize(statement) }
        sqlite3_bind_text(statement, 1, date, -1, SQLITE_TRANSIENT)
        var result: [AgendaItem] = []
        while sqlite3_step(statement) == SQLITE_ROW { result.append(Self.readItem(statement)) }
        return result
    }

    func allItems(filter: LibraryFilter = .all) throws -> [AgendaItem] {
        var whereClause = ""
        var argument: String?
        switch filter {
        case .inbox: whereClause = " WHERE space_id IS NULL"
        case .completed: whereClause = " WHERE type='task' AND completed=1"
        case .space(let id): whereClause = " WHERE space_id=?"; argument = id
        default: break
        }
        let statement = try prepare("SELECT id,type,title,details,space_id,priority,date,time,reminder_at,device_event_id,notification_id,completed,completed_at,duration_minutes,recurrence,created_at,updated_at FROM agenda_items\(whereClause) ORDER BY date DESC,time,title")
        defer { sqlite3_finalize(statement) }
        if let argument { sqlite3_bind_text(statement, 1, argument, -1, SQLITE_TRANSIENT) }
        var result: [AgendaItem] = []
        while sqlite3_step(statement) == SQLITE_ROW { result.append(Self.readItem(statement)) }
        return result
    }

    func spaces() throws -> [Space] {
        let statement = try prepare("SELECT id,name,color,icon,is_pinned,is_system,sort_order,created_at FROM spaces ORDER BY sort_order,name")
        defer { sqlite3_finalize(statement) }
        var result: [Space] = []
        while sqlite3_step(statement) == SQLITE_ROW {
            result.append(Space(id: Self.text(statement,0)!, name: Self.text(statement,1)!, color: Self.text(statement,2)!, icon: Self.text(statement,3), isPinned: sqlite3_column_int(statement,4) != 0, isSystem: sqlite3_column_int(statement,5) != 0, order: Int(sqlite3_column_int(statement,6)), createdAt: Self.text(statement,7)!))
        }
        return result
    }

    func saveSpace(_ space: Space) throws {
        let statement = try prepare("INSERT OR REPLACE INTO spaces(id,name,color,icon,is_pinned,is_system,sort_order,created_at) VALUES(?,?,?,?,?,?,?,?)")
        defer { sqlite3_finalize(statement) }
        [space.id,space.name,space.color,space.icon,space.isPinned ? "1":"0",space.isSystem ? "1":"0",String(space.order),space.createdAt].enumerated().forEach { index,value in if let value { sqlite3_bind_text(statement,Int32(index+1),value,-1,SQLITE_TRANSIENT) } else { sqlite3_bind_null(statement,Int32(index+1)) } }
        guard sqlite3_step(statement) == SQLITE_DONE else { throw DatabaseError.execute(lastError) }
    }

    func deleteSpace(_ id: String) throws { try executePrepared("DELETE FROM spaces WHERE id=?", id) }

    func routines(for date: String) throws -> [RoutineStatus] {
        let statement = try prepare("SELECT r.id,r.name,r.space_id,r.sort_order,r.active,r.created_at,r.updated_at,CASE WHEN c.routine_id IS NULL THEN 0 ELSE 1 END FROM routines r LEFT JOIN routine_completions c ON c.routine_id=r.id AND c.date=? WHERE r.active=1 ORDER BY r.sort_order,r.name")
        defer { sqlite3_finalize(statement) }; sqlite3_bind_text(statement,1,date,-1,SQLITE_TRANSIENT)
        var result:[RoutineStatus]=[]
        while sqlite3_step(statement)==SQLITE_ROW { result.append(RoutineStatus(routine: Routine(id:Self.text(statement,0)!,name:Self.text(statement,1)!,spaceId:Self.text(statement,2),order:Int(sqlite3_column_int(statement,3)),active:sqlite3_column_int(statement,4) != 0,createdAt:Self.text(statement,5)!,updatedAt:Self.text(statement,6)!),completed:sqlite3_column_int(statement,7) != 0)) }
        return result
    }

    func saveRoutine(_ routine: Routine) throws {
        let statement=try prepare("INSERT OR REPLACE INTO routines(id,name,space_id,sort_order,active,created_at,updated_at) VALUES(?,?,?,?,?,?,?)"); defer{sqlite3_finalize(statement)}
        [routine.id,routine.name,routine.spaceId,String(routine.order),routine.active ? "1":"0",routine.createdAt,routine.updatedAt].enumerated().forEach { i,v in if let v { sqlite3_bind_text(statement,Int32(i+1),v,-1,SQLITE_TRANSIENT) } else { sqlite3_bind_null(statement,Int32(i+1)) } }
        guard sqlite3_step(statement)==SQLITE_DONE else { throw DatabaseError.execute(lastError) }
    }

    func toggleRoutine(_ id:String,date:String,completed:Bool) throws {
        if completed { let s=try prepare("DELETE FROM routine_completions WHERE routine_id=? AND date=?"); defer{sqlite3_finalize(s)}; sqlite3_bind_text(s,1,id,-1,SQLITE_TRANSIENT); sqlite3_bind_text(s,2,date,-1,SQLITE_TRANSIENT); guard sqlite3_step(s)==SQLITE_DONE else{throw DatabaseError.execute(lastError)} }
        else { let s=try prepare("INSERT OR REPLACE INTO routine_completions(routine_id,date,completed_at) VALUES(?,?,?)"); defer{sqlite3_finalize(s)}; sqlite3_bind_text(s,1,id,-1,SQLITE_TRANSIENT); sqlite3_bind_text(s,2,date,-1,SQLITE_TRANSIENT); sqlite3_bind_text(s,3,ISO8601DateFormatter().string(from:.now),-1,SQLITE_TRANSIENT); guard sqlite3_step(s)==SQLITE_DONE else{throw DatabaseError.execute(lastError)} }
    }

    func notes() throws -> [DailyNote] {
        let s=try prepare("SELECT id,date,body_text,drawing_id,updated_at FROM daily_notes ORDER BY date DESC"); defer{sqlite3_finalize(s)}; var result:[DailyNote]=[]
        while sqlite3_step(s)==SQLITE_ROW { result.append(DailyNote(id:Self.text(s,0)!,date:Self.text(s,1)!,bodyText:Self.text(s,2) ?? "",drawingId:Self.text(s,3),updatedAt:Self.text(s,4)!)) }; return result
    }

    func drawing(for date:String) throws -> InkDocument {
        let s=try prepare("SELECT d.data FROM drawings d JOIN daily_notes n ON n.id=d.note_id WHERE n.date=? LIMIT 1"); defer{sqlite3_finalize(s)}; sqlite3_bind_text(s,1,date,-1,SQLITE_TRANSIENT)
        guard sqlite3_step(s)==SQLITE_ROW,let data=Self.text(s,0)?.data(using:.utf8) else{return InkDocument()}
        return (try? JSONDecoder().decode(InkDocument.self,from:data)) ?? InkDocument()
    }

    func saveDrawing(_ document:InkDocument,for date:String) throws {
        let body=try note(for:date); try saveNote(body,for:date)
        let find=try prepare("SELECT id FROM daily_notes WHERE date=?"); defer{sqlite3_finalize(find)}; sqlite3_bind_text(find,1,date,-1,SQLITE_TRANSIENT); guard sqlite3_step(find)==SQLITE_ROW,let noteId=Self.text(find,0) else{return}

        if document.pencilKitData == nil && document.strokes.isEmpty {
            try executePrepared("DELETE FROM drawings WHERE note_id=?", noteId)
            try executePrepared("UPDATE daily_notes SET drawing_id=NULL WHERE id=?", noteId)
            return
        }

        let now=ISO8601DateFormatter().string(from:.now), data=String(data:try JSONEncoder().encode(document),encoding:.utf8)!
        let existing=try prepare("SELECT id FROM drawings WHERE note_id=? LIMIT 1"); sqlite3_bind_text(existing,1,noteId,-1,SQLITE_TRANSIENT); let id=sqlite3_step(existing)==SQLITE_ROW ? Self.text(existing,0)! : UUID().uuidString; sqlite3_finalize(existing)
        let s=try prepare("INSERT OR REPLACE INTO drawings(id,note_id,format,data,created_at,updated_at) VALUES(?,?,'ink-v1',?,?,?)"); defer{sqlite3_finalize(s)}
        [id,noteId,data,now,now].enumerated().forEach{sqlite3_bind_text(s,Int32($0.offset+1),$0.element,-1,SQLITE_TRANSIENT)}; guard sqlite3_step(s)==SQLITE_DONE else{throw DatabaseError.execute(lastError)}
        try executePrepared("UPDATE daily_notes SET drawing_id=? WHERE id=?",id,noteId)
    }

    private func executePrepared(_ sql:String,_ values:String...) throws { let s=try prepare(sql); defer{sqlite3_finalize(s)}; values.enumerated().forEach{sqlite3_bind_text(s,Int32($0.offset+1),$0.element,-1,SQLITE_TRANSIENT)}; guard sqlite3_step(s)==SQLITE_DONE else{throw DatabaseError.execute(lastError)} }

    func search(_ query: String) throws -> [AgendaItem] {
        let sql = "SELECT id,type,title,details,space_id,priority,date,time,reminder_at,device_event_id,notification_id,completed,completed_at,duration_minutes,recurrence,created_at,updated_at FROM agenda_items WHERE title LIKE ? OR details LIKE ? ORDER BY date DESC,time,title"
        let statement = try prepare(sql)
        defer { sqlite3_finalize(statement) }
        let pattern = "%\(query)%"
        sqlite3_bind_text(statement, 1, pattern, -1, SQLITE_TRANSIENT)
        sqlite3_bind_text(statement, 2, pattern, -1, SQLITE_TRANSIENT)
        var result: [AgendaItem] = []
        while sqlite3_step(statement) == SQLITE_ROW { result.append(Self.readItem(statement)) }
        return result
    }

    func save(_ item: AgendaItem) throws {
        let sql = """
        INSERT OR REPLACE INTO agenda_items
        (id,type,title,details,space_id,priority,date,time,reminder_at,device_event_id,notification_id,completed,completed_at,duration_minutes,recurrence,created_at,updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """
        let statement = try prepare(sql)
        defer { sqlite3_finalize(statement) }
        let values: [String?] = [item.id,item.type.rawValue,item.title,item.details,item.spaceId,item.priority.rawValue,item.date,item.time,item.reminderAt,item.deviceEventId,item.notificationId,item.completed.map { $0 ? "1" : "0" },item.completedAt,item.durationMinutes.map(String.init),item.recurrence,item.createdAt,item.updatedAt]
        for (offset, value) in values.enumerated() {
            if let value { sqlite3_bind_text(statement, Int32(offset + 1), value, -1, SQLITE_TRANSIENT) }
            else { sqlite3_bind_null(statement, Int32(offset + 1)) }
        }
        guard sqlite3_step(statement) == SQLITE_DONE else { throw DatabaseError.execute(lastError) }
    }

    func deleteItem(id: String) throws {
        let statement = try prepare("DELETE FROM agenda_items WHERE id=?")
        defer { sqlite3_finalize(statement) }
        sqlite3_bind_text(statement, 1, id, -1, SQLITE_TRANSIENT)
        guard sqlite3_step(statement) == SQLITE_DONE else { throw DatabaseError.execute(lastError) }
    }

    func note(for date: String) throws -> String {
        let statement = try prepare("SELECT body_text FROM daily_notes WHERE date=?")
        defer { sqlite3_finalize(statement) }
        sqlite3_bind_text(statement, 1, date, -1, SQLITE_TRANSIENT)
        return sqlite3_step(statement) == SQLITE_ROW ? Self.text(statement, 0) ?? "" : ""
    }

    func saveNote(_ body: String, for date: String) throws {
        let now = ISO8601DateFormatter().string(from: .now)
        let statement = try prepare("INSERT INTO daily_notes(id,date,body_text,updated_at) VALUES(?,?,?,?) ON CONFLICT(date) DO UPDATE SET body_text=excluded.body_text,updated_at=excluded.updated_at")
        defer { sqlite3_finalize(statement) }
        [UUID().uuidString,date,body,now].enumerated().forEach { sqlite3_bind_text(statement, Int32($0.offset + 1), $0.element, -1, SQLITE_TRANSIENT) }
        guard sqlite3_step(statement) == SQLITE_DONE else { throw DatabaseError.execute(lastError) }
    }

    func setTaskCompleted(id: String, completed: Bool) throws {
        let now = ISO8601DateFormatter().string(from: .now)
        let statement = try prepare("UPDATE agenda_items SET completed=?, completed_at=?, updated_at=? WHERE id=? AND type='task'")
        defer { sqlite3_finalize(statement) }
        sqlite3_bind_int(statement, 1, completed ? 1 : 0)
        if completed { sqlite3_bind_text(statement, 2, now, -1, SQLITE_TRANSIENT) } else { sqlite3_bind_null(statement, 2) }
        sqlite3_bind_text(statement, 3, now, -1, SQLITE_TRANSIENT)
        sqlite3_bind_text(statement, 4, id, -1, SQLITE_TRANSIENT)
        guard sqlite3_step(statement) == SQLITE_DONE else { throw DatabaseError.execute(lastError) }
    }

    private func prepare(_ sql: String) throws -> OpaquePointer? {
        var statement: OpaquePointer?
        guard sqlite3_prepare_v2(handle, sql, -1, &statement, nil) == SQLITE_OK else { throw DatabaseError.prepare(lastError) }
        return statement
    }

    private var lastError: String { handle.map { String(cString: sqlite3_errmsg($0)) } ?? "SQLite error" }
    private static func text(_ statement: OpaquePointer?, _ index: Int32) -> String? {
        sqlite3_column_text(statement, index).map { String(cString: $0) }
    }

    private static func readItem(_ row: OpaquePointer?) -> AgendaItem {
        AgendaItem(
            id: text(row, 0)!, type: AgendaItemType(rawValue: text(row, 1)!)!, title: text(row, 2)!,
            details: text(row, 3), spaceId: text(row, 4), priority: Priority(rawValue: text(row, 5) ?? "none") ?? .none,
            date: text(row, 6)!, time: text(row, 7), reminderAt: text(row, 8), deviceEventId: text(row, 9),
            notificationId: text(row, 10), completed: sqlite3_column_type(row, 11) == SQLITE_NULL ? nil : sqlite3_column_int(row, 11) != 0,
            completedAt: text(row, 12), durationMinutes: sqlite3_column_type(row, 13) == SQLITE_NULL ? nil : Int(sqlite3_column_int(row, 13)),
            recurrence: text(row, 14), createdAt: text(row, 15)!, updatedAt: text(row, 16)!
        )
    }

    static let migration1 = [
        "CREATE TABLE IF NOT EXISTS spaces (id TEXT PRIMARY KEY NOT NULL,name TEXT NOT NULL,color TEXT NOT NULL,icon TEXT,is_pinned INTEGER NOT NULL DEFAULT 0,is_system INTEGER NOT NULL DEFAULT 0,sort_order INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL)",
        "CREATE TABLE IF NOT EXISTS agenda_items (id TEXT PRIMARY KEY NOT NULL,type TEXT NOT NULL CHECK(type IN ('task','event','note')),title TEXT NOT NULL,details TEXT,space_id TEXT REFERENCES spaces(id) ON DELETE SET NULL,priority TEXT NOT NULL DEFAULT 'none',date TEXT NOT NULL,time TEXT,reminder_at TEXT,device_event_id TEXT,notification_id TEXT,completed INTEGER,completed_at TEXT,duration_minutes INTEGER,recurrence TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)",
        "CREATE INDEX IF NOT EXISTS idx_agenda_items_date ON agenda_items(date)",
        "CREATE INDEX IF NOT EXISTS idx_agenda_items_space ON agenda_items(space_id)",
        "CREATE INDEX IF NOT EXISTS idx_agenda_items_type ON agenda_items(type)",
        "CREATE TABLE IF NOT EXISTS routines (id TEXT PRIMARY KEY NOT NULL,name TEXT NOT NULL,space_id TEXT REFERENCES spaces(id) ON DELETE SET NULL,sort_order INTEGER NOT NULL DEFAULT 0,active INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)",
        "CREATE TABLE IF NOT EXISTS routine_completions (routine_id TEXT NOT NULL REFERENCES routines(id) ON DELETE CASCADE,date TEXT NOT NULL,completed_at TEXT NOT NULL,PRIMARY KEY(routine_id,date))",
        "CREATE TABLE IF NOT EXISTS daily_notes (id TEXT PRIMARY KEY NOT NULL,date TEXT NOT NULL UNIQUE,body_text TEXT NOT NULL DEFAULT '',drawing_id TEXT,updated_at TEXT NOT NULL)",
        "CREATE TABLE IF NOT EXISTS drawings (id TEXT PRIMARY KEY NOT NULL,note_id TEXT NOT NULL REFERENCES daily_notes(id) ON DELETE CASCADE,format TEXT NOT NULL DEFAULT 'ink-v1',data TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)",
        "CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY NOT NULL,value TEXT NOT NULL)"
    ]
    static let migration3 = [
        "CREATE TABLE IF NOT EXISTS note_drafts (date TEXT PRIMARY KEY NOT NULL,body_text TEXT NOT NULL DEFAULT '',base_updated_at TEXT NOT NULL,updated_at TEXT NOT NULL)",
    ]
    static let migration4 = [
        "CREATE TABLE IF NOT EXISTS daily_page_blocks (id TEXT PRIMARY KEY NOT NULL,note_id TEXT NOT NULL REFERENCES daily_notes(id) ON DELETE CASCADE,position INTEGER NOT NULL,type TEXT NOT NULL CHECK(type IN ('text','ink')),text TEXT,drawing_id TEXT REFERENCES drawings(id) ON DELETE CASCADE,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)",
        "CREATE INDEX IF NOT EXISTS idx_daily_page_blocks_note_position ON daily_page_blocks(note_id,position)"
    ]
}
