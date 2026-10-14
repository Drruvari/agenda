import Foundation

enum AgendaItemType: String, Codable, CaseIterable { case task, event, note }
enum Priority: String, Codable, CaseIterable { case none, low, medium, high }

struct Space: Identifiable, Equatable, Sendable {
    let id: String
    var name: String
    var color: String
    var icon: String?
    var isPinned: Bool
    var isSystem: Bool
    var order: Int
    let createdAt: String
}

struct AgendaItem: Identifiable, Equatable, Sendable {
    let id: String
    var type: AgendaItemType
    var title: String
    var details: String?
    var spaceId: String?
    var priority: Priority
    var date: String
    var time: String?
    var reminderAt: String?
    var deviceEventId: String?
    var notificationId: String?
    var completed: Bool?
    var completedAt: String?
    var durationMinutes: Int?
    var recurrence: String?
    let createdAt: String
    var updatedAt: String
}

struct Routine: Identifiable, Equatable, Sendable {
    let id: String
    var name: String
    var spaceId: String?
    var order: Int
    var active: Bool
    let createdAt: String
    var updatedAt: String
}

struct DailyNote: Identifiable, Equatable, Sendable {
    let id: String
    let date: String
    var bodyText: String
    var drawingId: String?
    var updatedAt: String
}

struct RoutineStatus: Identifiable, Equatable, Sendable {
    var id: String { routine.id }
    let routine: Routine
    var completed: Bool
}

struct DeviceEvent: Identifiable, Equatable, Sendable {
    let id: String
    let title: String
    let start: Date
    let end: Date
    let allDay: Bool
    let calendar: String
    let isBirthday: Bool
}

struct InkPoint: Codable, Equatable, Sendable { var x: Double; var y: Double; var p: Double? }
struct InkStroke: Identifiable, Codable, Equatable, Sendable {
    var id: String
    var color: String
    var width: Double
    var opacity: Double?
    var points: [InkPoint]
}
struct InkViewState: Codable, Equatable, Sendable { var x = 0.0; var y = 0.0; var scale = 1.0 }
struct InkDocument: Codable, Equatable, Sendable {
    var version = 1
    var strokes: [InkStroke] = []
    var view: InkViewState? = InkViewState()
    var pencilKitData: String?
}

enum LibraryFilter: Hashable { case inbox, all, completed, notes, space(String), routines }

enum AgendaDate {
    static let formatter: DateFormatter = {
        let value = DateFormatter()
        value.calendar = Calendar(identifier: .gregorian)
        value.locale = Locale(identifier: "en_US_POSIX")
        value.dateFormat = "yyyy-MM-dd"
        return value
    }()

    static func localDay(_ date: Date = .now) -> String { formatter.string(from: date) }
    static func date(_ string: String) -> Date { formatter.date(from: string) ?? .now }
    static func moving(_ string: String, by days: Int) -> String {
        localDay(Calendar.current.date(byAdding: .day, value: days, to: date(string)) ?? .now)
    }
    static func title(_ string: String) -> String {
        let date = date(string)
        if Calendar.current.isDateInToday(date) { return "Today" }
        let formatter = DateFormatter(); formatter.dateStyle = .full
        return formatter.string(from: date)
    }
}
