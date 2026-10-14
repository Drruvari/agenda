import XCTest
import SQLite3
@testable import AgendaNative

final class AgendaDateTests: XCTestCase {
    func testLocalDayUsesLegacyShape() {
        XCTAssertNotNil(AgendaDate.localDay().wholeMatch(of: /\d{4}-\d{2}-\d{2}/))
    }

    func testMovingDayRoundTrips() {
        XCTAssertEqual(AgendaDate.moving("2026-10-01", by: 1), "2026-10-02")
        XCTAssertEqual(AgendaDate.moving("2026-10-01", by: -1), "2026-09-30")
    }

    func testInkV1RoundTrip() throws {
        let original = InkDocument(strokes: [InkStroke(id: "stroke", color: "#000000", width: 3, points: [InkPoint(x: 1, y: 2)])])
        let decoded = try JSONDecoder().decode(InkDocument.self, from: JSONEncoder().encode(original))
        XCTAssertEqual(decoded, original)
    }

    func testDatabaseClearsEmptyDrawing() async throws {
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString).appendingPathExtension("sqlite")
        defer { try? FileManager.default.removeItem(at: url) }
        let db = try AgendaDatabase(url: url)
        let date = "2026-10-01"

        var doc = InkDocument(strokes: [InkStroke(id: "stroke1", color: "#000000", width: 2, points: [InkPoint(x: 0, y: 0), InkPoint(x: 10, y: 10)])])
        try await db.saveDrawing(doc, for: date)

        let savedDoc = try await db.drawing(for: date)
        XCTAssertEqual(savedDoc.strokes.count, 1)

        doc.strokes = []
        doc.pencilKitData = nil
        try await db.saveDrawing(doc, for: date)

        let clearedDoc = try await db.drawing(for: date)
        XCTAssertTrue(clearedDoc.strokes.isEmpty)
        XCTAssertNil(clearedDoc.pencilKitData)
    }

    func testDatabaseMigratesMetadataToVersionFour() throws {
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString).appendingPathExtension("sqlite")
        defer { try? FileManager.default.removeItem(at: url) }
        _ = try AgendaDatabase(url: url)
        var handle: OpaquePointer?
        XCTAssertEqual(sqlite3_open(url.path, &handle), SQLITE_OK)
        XCTAssertEqual(sqlite3_exec(handle, "DROP TABLE daily_page_blocks; PRAGMA user_version = 3", nil, nil, nil), SQLITE_OK)
        sqlite3_close(handle)
        _ = try AgendaDatabase(url: url)
        handle = nil
        XCTAssertEqual(sqlite3_open(url.path, &handle), SQLITE_OK)
        var statement: OpaquePointer?
        XCTAssertEqual(sqlite3_prepare_v2(handle, "PRAGMA user_version", -1, &statement, nil), SQLITE_OK)
        XCTAssertEqual(sqlite3_step(statement), SQLITE_ROW)
        XCTAssertEqual(sqlite3_column_int(statement, 0), 4)
        sqlite3_finalize(statement)
        sqlite3_close(handle)
    }
}
