import SwiftUI
import WidgetKit

@main struct AgendaApp: App {
    @StateObject private var store = AgendaStore()
    @StateObject private var services = NativeServices()
    @Environment(\.scenePhase) private var phase

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(store)
                .environmentObject(services)
                .preferredColorScheme(store.colorScheme)
                .agendaOnChange(of: phase) { next in
                    if next == .inactive { store.didBackground() }
                    if next == .active { Task { await store.unlockIfNeeded(using: services) } }
                }
        }
    }
}

@MainActor final class AgendaStore: ObservableObject {
    @Published var selectedDate = AgendaDate.localDay()
    @Published var items: [AgendaItem] = []
    @Published var allItems: [AgendaItem] = []
    @Published var spaces: [Space] = []
    @Published var routines: [RoutineStatus] = []
    @Published var notes: [DailyNote] = []
    @Published var dailyNote = ""
    @Published var ink = InkDocument()
    @Published var searchResults: [AgendaItem] = []
    @Published var errorMessage: String?
    @Published var locked = false
    @Published var quickAddRequest = 0

    @AppStorage("agenda.appearance") var appearance = "system"
    @AppStorage("agenda.appLock") var appLock = false
    @AppStorage("agenda.showCompleted") var showCompleted = true
    @AppStorage("agenda.dateFormat") var dateFormat = "long"
    @AppStorage("agenda.weekStartsOn") var weekStartsOn = "monday"
    @AppStorage("agenda.accent") var accent = "blue"
    @AppStorage("agenda.showSpaces") var showSpaces = true
    @AppStorage("agenda.compactStream") var compactStream = false
    @AppStorage("agenda.keepFilter") var keepFilter = true
    @AppStorage("agenda.calendarIndicators") var calendarIndicators = true
    @AppStorage("agenda.clickToEdit") var clickToEdit = true
    @AppStorage("agenda.penOnly") var penOnly = false
    @AppStorage("agenda.pullToAdd") var pullToAdd = true
    @AppStorage("agenda.pullToSearch") var pullToSearch = false
    @AppStorage("agenda.swipeDays") var swipeDays = true
    @AppStorage("agenda.editorFontSize") var editorFontSize = 17.0
    @AppStorage("agenda.pageMargin") var pageMargin = 24.0
    @AppStorage("agenda.defaultType") var defaultType = "task"
    @AppStorage("agenda.defaultDuration") var defaultDuration = 30
    @AppStorage("agenda.defaultSpace") var defaultSpace = ""
    @AppStorage("agenda.smartParsing") var smartParsing = true
    @AppStorage("agenda.numberedLists") var numberedLists = true
    @AppStorage("agenda.markdown") var markdown = true
    @AppStorage("agenda.lockDelay") var lockDelay = "immediately"
    @AppStorage("agenda.notificationPreview") var notificationPreview = "full"
    @AppStorage("agenda.indexNotes") var indexNotes = true
    @AppStorage("agenda.todayShortcut") var todayShortcut = true
    @AppStorage("agenda.calendarEnabled") var calendarEnabled = false
    @AppStorage("agenda.birthdaysEnabled") var birthdaysEnabled = false
    @AppStorage("agenda.notificationsEnabled") var notificationsEnabled = false

    private var database: AgendaDatabase?
    private var backgroundedAt: Date?

    var colorScheme: ColorScheme? {
        appearance == "dark" ? .dark : appearance == "light" ? .light : nil
    }

    init() {
        do { database = try AgendaDatabase() }
        catch { errorMessage = error.localizedDescription }
    }

    func refresh() async {
        do {
            guard let database else { return }
            async let day = database.items(for: selectedDate)
            async let all = database.allItems()
            async let s = database.spaces()
            async let r = database.routines(for: selectedDate)
            async let n = database.notes()

            items = try await day
            allItems = try await all
            spaces = try await s
            routines = try await r
            notes = try await n
            publishWidget()
        } catch { fail(error) }
    }

    func moveDay(_ amount: Int) {
        Task {
            await savePage()
            selectedDate = AgendaDate.moving(selectedDate, by: amount)
        }
    }

    func toggle(_ item: AgendaItem) async {
        do {
            try await database?.setTaskCompleted(id: item.id, completed: !(item.completed ?? false))
            await refresh()
        } catch { fail(error) }
    }

    func save(_ item: AgendaItem) async {
        do {
            try await database?.save(item)
            await refresh()
        } catch { fail(error) }
    }

    func delete(_ item: AgendaItem) async {
        do {
            try await database?.deleteItem(id: item.id)
            await refresh()
        } catch { fail(error) }
    }

    func search(_ query: String) async {
        do {
            searchResults = query.isEmpty ? [] : try await database?.search(query) ?? []
        } catch { fail(error) }
    }

    func saveSpace(name: String, color: String) async {
        let now = ISO8601DateFormatter().string(from: .now)
        do {
            try await database?.saveSpace(Space(id: UUID().uuidString, name: name, color: color, icon: nil, isPinned: true, isSystem: false, order: spaces.count, createdAt: now))
            await refresh()
        } catch { fail(error) }
    }

    func deleteSpace(_ space: Space) async {
        do {
            try await database?.deleteSpace(space.id)
            await refresh()
        } catch { fail(error) }
    }

    func saveRoutine(name: String, spaceId: String?) async {
        let now = ISO8601DateFormatter().string(from: .now)
        do {
            try await database?.saveRoutine(Routine(id: UUID().uuidString, name: name, spaceId: spaceId, order: routines.count, active: true, createdAt: now, updatedAt: now))
            await refresh()
        } catch { fail(error) }
    }

    func toggleRoutine(_ status: RoutineStatus) async {
        do {
            try await database?.toggleRoutine(status.id, date: selectedDate, completed: status.completed)
            await refresh()
        } catch { fail(error) }
    }

    func loadPage() async {
        do {
            dailyNote = try await database?.note(for: selectedDate) ?? ""
            ink = try await database?.drawing(for: selectedDate) ?? InkDocument()
        } catch { fail(error) }
    }

    func savePage() async {
        do {
            try await database?.saveNote(dailyNote, for: selectedDate)
            try await database?.saveDrawing(ink, for: selectedDate)
            await refresh()
        } catch { fail(error) }
    }

    func didBackground() {
        backgroundedAt = .now
        if appLock, lockDelay == "immediately" { locked = true }
    }

    func unlockIfNeeded(using services: NativeServices) async {
        guard appLock else { locked = false; return }
        let delay = TimeInterval(lockDelay) ?? 0
        if let backgroundedAt, Date.now.timeIntervalSince(backgroundedAt) >= delay { locked = true }
        guard locked else { return }
        locked = !(await services.authenticate())
    }

    func exportText() -> String {
        allItems.map { "\($0.date)\t\($0.time ?? "All day")\t\($0.type.rawValue)\t\($0.title)" }.joined(separator: "\n")
    }

    func resetEditorSettings() {
        editorFontSize = 17
        pageMargin = 24
        defaultType = "task"
        defaultDuration = 30
        defaultSpace = ""
        smartParsing = true
        numberedLists = true
        markdown = true
    }

    private func publishWidget() {
        let snapshot = items.prefix(6).map { ["title": $0.title, "time": $0.time ?? "", "done": $0.completed == true ? "1" : "0"] }
        UserDefaults(suiteName: "group.com.drruvari.agenda")?.set(snapshot, forKey: "agenda.widget.items")
        WidgetCenter.shared.reloadAllTimelines()
    }

    private func fail(_ error: Error) { errorMessage = error.localizedDescription }
}

enum AppTab: Hashable { case agenda, page, library }
enum PageMode: String, CaseIterable { case write = "Write", draw = "Draw" }

extension AgendaStore {
    var tint: Color {
        switch accent {
        case "red": .red
        case "purple": .purple
        case "green": .green
        case "orange": .orange
        case "pink": .pink
        case "brown": .brown
        default: .blue
        }
    }
}

struct RootView: View {
    @EnvironmentObject var store: AgendaStore
    @State private var selectedTab = AppTab.agenda
    @State private var pageMode = PageMode.write

    var body: some View {
        ZStack {
            TabView(selection: $selectedTab) {
                NavigationStack {
                    AgendaView()
                }
                .tabItem { Label("Agenda", systemImage: "calendar") }
                .tag(AppTab.agenda)

                NavigationStack {
                    PageWorkspaceView(mode: $pageMode, isActive: selectedTab == .page)
                }
                .tabItem { Label("Page", systemImage: "doc.text") }
                .tag(AppTab.page)

                NavigationStack {
                    LibraryView()
                }
                .tabItem { Label("Library", systemImage: "books.vertical") }
                .tag(AppTab.library)
            }
            .tint(store.tint)
            .disabled(store.locked)
            .blur(radius: store.locked ? 12 : 0)
            .animation(nil, value: store.locked)

            if store.locked {
                LockView()
            }
        }
        .alert("Agenda", isPresented: Binding(get: { store.errorMessage != nil }, set: { if !$0 { store.errorMessage = nil } })) {
            Button("OK") { store.errorMessage = nil }
        } message: {
            Text(store.errorMessage ?? "")
        }
    }
}

struct AgendaView: View {
    @EnvironmentObject var store: AgendaStore
    @EnvironmentObject var services: NativeServices
    @State private var editor: AgendaItem?
    @State private var adding = false
    @State private var showRoutines = false
    @State private var showCalendar = false
    @State private var showSettings = false
    @State private var query = ""

    var visible: [AgendaItem] {
        let base = store.showCompleted ? store.items : store.items.filter { $0.completed != true }
        return query.isEmpty ? base : base.filter { $0.title.localizedCaseInsensitiveContains(query) || ($0.details?.localizedCaseInsensitiveContains(query) == true) }
    }

    var body: some View {
        List {
            Section {
                HStack {
                    Button { store.moveDay(-1) } label: {
                        Image(systemName: "chevron.left")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(.secondary)
                    }
                    Spacer()
                    Button { showCalendar = true } label: {
                        Text(AgendaDate.date(store.selectedDate).formatted(.dateTime.weekday(.wide).month(.wide).day()))
                            .font(.subheadline.weight(.medium))
                            .foregroundStyle(.primary)
                    }
                    Spacer()
                    Button { store.moveDay(1) } label: {
                        Image(systemName: "chevron.right")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(.secondary)
                    }
                }
                .padding(.vertical, 2)
                .listRowSeparator(.hidden)
            }

            let active = visible.filter { $0.completed != true }
            let allDay = active.filter { $0.time == nil }
            let scheduled = active.filter { $0.time != nil }

            if !allDay.isEmpty {
                Section("All Day") { ForEach(allDay) { ItemButton(item: $0, editor: $editor) } }
            }
            if !scheduled.isEmpty {
                Section("Schedule") { ForEach(scheduled) { ItemButton(item: $0, editor: $editor) } }
            }
            if store.calendarIndicators && (!services.events.isEmpty || !services.birthdays.isEmpty) {
                Section("Calendar") {
                    ForEach(services.birthdays + services.events) { event in
                        HStack {
                            Image(systemName: event.isBirthday ? "gift" : "calendar")
                                .foregroundStyle(event.isBirthday ? .pink : .blue)
                            VStack(alignment: .leading) {
                                Text(event.title)
                                Text(event.allDay ? event.calendar : event.start.formatted(date: .omitted, time: .shortened))
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                }
            }
            if !store.routines.isEmpty {
                Section("Routines") {
                    ForEach(store.routines) { status in
                        Button { Task { await store.toggleRoutine(status) } } label: {
                            Label(status.routine.name, systemImage: status.completed ? "checkmark.circle.fill" : "circle")
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            let completed = visible.filter { $0.completed == true }
            if !completed.isEmpty {
                Section("Completed · \(completed.count)") {
                    ForEach(completed) { ItemButton(item: $0, editor: $editor) }
                }
            }
            if visible.isEmpty && services.events.isEmpty {
                VStack(spacing: 12) {
                    Image(systemName: "sun.max")
                        .font(.system(size: 36))
                        .foregroundStyle(.secondary)
                    Text("A Clear Day")
                        .font(.headline)
                    Text("Nothing scheduled for today.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    Button("Add Item") { adding = true }
                        .buttonStyle(.borderedProminent)
                        .padding(.top, 4)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 36)
                .listRowSeparator(.hidden)
            }
        }
        .listStyle(.plain)
        .navigationTitle(AgendaDate.title(store.selectedDate))
        .searchable(text: $query, prompt: "Search Agenda")
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button { adding = true } label: { Image(systemName: "plus") }
            }
            ToolbarItemGroup(placement: .topBarTrailing) {
                Button { showCalendar = true } label: { Image(systemName: "calendar") }
                Menu {
                    Button { showRoutines = true } label: { Label("Routines", systemImage: "repeat") }
                    Button { showSettings = true } label: { Label("Settings", systemImage: "gearshape") }
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
            }
        }
        .refreshable {
            await store.refresh()
            await services.load(for: store.selectedDate, calendarEnabled: store.calendarEnabled, birthdaysEnabled: store.birthdaysEnabled)
        }
        .task(id: store.selectedDate) {
            await store.refresh()
            await services.load(for: store.selectedDate, calendarEnabled: store.calendarEnabled, birthdaysEnabled: store.birthdaysEnabled)
        }
        .agendaOnChange(of: store.quickAddRequest) { _ in adding = true }
        .sheet(isPresented: $adding) { ItemEditor(date: store.selectedDate) }
        .sheet(item: $editor) { ItemEditor(item: $0, date: $0.date) }
        .sheet(isPresented: $showRoutines) { NavigationStack { RoutinesView() } }
        .sheet(isPresented: $showSettings) { NavigationStack { SettingsHubView() } }
        .sheet(isPresented: $showCalendar) { CalendarSheetView() }
    }
}

struct CalendarSheetView: View {
    @EnvironmentObject var store: AgendaStore
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationStack {
            VStack {
                DatePicker(
                    "Choose Date",
                    selection: Binding(
                        get: { AgendaDate.date(store.selectedDate) },
                        set: { target in
                            Task {
                                await store.savePage()
                                store.selectedDate = AgendaDate.localDay(target)
                                dismiss()
                            }
                        }
                    ),
                    displayedComponents: .date
                )
                .datePickerStyle(.graphical)
                .tint(store.tint)
                .padding()

                Spacer()
            }
            .navigationTitle("Calendar")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Today") {
                        Task {
                            await store.savePage()
                            store.selectedDate = AgendaDate.localDay(.now)
                            dismiss()
                        }
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                        .fontWeight(.semibold)
                }
            }
        }
        .presentationDetents([.medium])
    }
}

struct ItemButton: View {
    let item: AgendaItem
    @Binding var editor: AgendaItem?
    @EnvironmentObject var store: AgendaStore

    var body: some View {
        Button { editor = item } label: {
            HStack(spacing: 12) {
                Button { Task { await store.toggle(item) } } label: {
                    Image(systemName: item.type == .task ? (item.completed == true ? "checkmark.circle.fill" : "circle") : item.type == .event ? "calendar" : "note.text")
                }
                .buttonStyle(.plain)
                .disabled(item.type != .task)

                VStack(alignment: .leading, spacing: 2) {
                    Text(item.title).strikethrough(item.completed == true)
                    if let details = item.details {
                        Text(details).lineLimit(1).font(.caption).foregroundStyle(.secondary)
                    }
                }
                Spacer()
                if let time = item.time {
                    Text(time).font(.caption).foregroundStyle(.secondary)
                }
            }
        }
        .buttonStyle(.plain)
        .swipeActions {
            Button(role: .destructive) { Task { await store.delete(item) } } label: {
                Label("Delete", systemImage: "trash")
            }
        }
    }
}

struct ItemEditor: View {
    @EnvironmentObject var store: AgendaStore
    @EnvironmentObject var services: NativeServices
    @Environment(\.dismiss) var dismiss

    let existing: AgendaItem?
    @State var title: String
    @State var details: String
    @State var date: Date
    @State var hasTime: Bool
    @State var time: Date
    @State var type: AgendaItemType
    @State var priority: Priority
    @State var spaceId: String?
    @State var reminder = false

    init(item: AgendaItem? = nil, date: String) {
        existing = item
        _title = State(initialValue: item?.title ?? "")
        _details = State(initialValue: item?.details ?? "")
        _date = State(initialValue: AgendaDate.date(item?.date ?? date))
        _hasTime = State(initialValue: item?.time != nil)
        let f = DateFormatter(); f.dateFormat = "HH:mm"
        _time = State(initialValue: f.date(from: item?.time ?? "09:00") ?? .now)
        _type = State(initialValue: item?.type ?? .task)
        _priority = State(initialValue: item?.priority ?? .none)
        _spaceId = State(initialValue: item?.spaceId)
        _reminder = State(initialValue: item?.reminderAt != nil)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Title", text: $title)
                    TextField("Notes", text: $details, axis: .vertical)
                }
                Section {
                    Picker("Type", selection: $type) { ForEach(AgendaItemType.allCases, id: \.self) { Text($0.rawValue.capitalized) } }
                    DatePicker("Date", selection: $date, displayedComponents: .date)
                    Toggle("Add time", isOn: $hasTime)
                    if hasTime { DatePicker("Time", selection: $time, displayedComponents: .hourAndMinute) }
                    Toggle("Remind me", isOn: $reminder)
                }
                Section {
                    Picker("Priority", selection: $priority) { ForEach(Priority.allCases, id: \.self) { Text($0.rawValue.capitalized) } }
                    Picker("Space", selection: $spaceId) {
                        Text("Inbox").tag(String?.none)
                        ForEach(store.spaces) { Text($0.name).tag(Optional($0.id)) }
                    }
                }
                if existing != nil {
                    Section {
                        Button("Delete", role: .destructive) {
                            Task { await store.delete(existing!); dismiss() }
                        }
                    }
                }
            }
            .navigationTitle(existing == nil ? "New Item" : "Edit Item")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { Task { await commit(); dismiss() } }
                        .disabled(title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
        }
    }

    private func commit() async {
        let now = ISO8601DateFormatter().string(from: .now), tf = DateFormatter()
        tf.dateFormat = "HH:mm"
        var value = AgendaItem(
            id: existing?.id ?? UUID().uuidString,
            type: type,
            title: title.trimmingCharacters(in: .whitespacesAndNewlines),
            details: details.isEmpty ? nil : details,
            spaceId: spaceId,
            priority: priority,
            date: AgendaDate.localDay(date),
            time: hasTime ? tf.string(from: time) : nil,
            reminderAt: reminder ? ISO8601DateFormatter().string(from: dateForReminder()) : nil,
            deviceEventId: existing?.deviceEventId,
            notificationId: existing?.notificationId,
            completed: existing?.completed ?? (type == .task ? false : nil),
            completedAt: existing?.completedAt,
            durationMinutes: type == .event ? existing?.durationMinutes ?? 30 : nil,
            recurrence: existing?.recurrence,
            createdAt: existing?.createdAt ?? now,
            updatedAt: now
        )
        if type == .event && value.deviceEventId == nil { value.deviceEventId = await services.createCalendarEvent(for: value) }
        if reminder { value.notificationId = await services.scheduleReminder(for: value) }
        await store.save(value)
    }

    private func dateForReminder() -> Date {
        let c = Calendar.current
        return c.date(bySettingHour: c.component(.hour, from: time), minute: c.component(.minute, from: time), second: 0, of: date) ?? date
    }
}

struct PageWorkspaceView: View {
    @Binding var mode: PageMode
    let isActive: Bool
    @EnvironmentObject var store: AgendaStore
    @State private var undoToken = 0
    @State private var clearToken = 0
    @State private var confirmClear = false
    @FocusState private var writing: Bool

    private var drawingActive: Binding<Bool> {
        Binding(get: { isActive && mode == .draw }, set: { _ in })
    }

    var body: some View {
        VStack(spacing: 0) {
            if mode == .write {
                ZStack(alignment: .topLeading) {
                    TextEditor(text: $store.dailyNote)
                        .font(.system(size: store.editorFontSize))
                        .padding(.horizontal, store.pageMargin)
                        .padding(.top, 8)
                        .focused($writing)

                    if store.dailyNote.isEmpty {
                        Text("Start writing…")
                            .font(.system(size: store.editorFontSize))
                            .foregroundStyle(.tertiary)
                            .padding(.horizontal, store.pageMargin + 5)
                            .padding(.top, 16)
                            .allowsHitTesting(false)
                    }
                }
            } else {
                InkCanvas(
                    document: $store.ink,
                    drawing: drawingActive,
                    pencilOnly: store.penOnly,
                    undoToken: undoToken,
                    clearToken: clearToken
                )
            }
        }
        .navigationTitle(AgendaDate.title(store.selectedDate))
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItemGroup(placement: .topBarLeading) {
                HStack(spacing: 12) {
                    Button { store.moveDay(-1) } label: { Image(systemName: "chevron.left") }
                    Button { store.moveDay(1) } label: { Image(systemName: "chevron.right") }
                }
            }

            ToolbarItem(placement: .principal) {
                Picker("Page Mode", selection: $mode) {
                    ForEach(PageMode.allCases, id: \.self) { Text($0.rawValue) }
                }
                .pickerStyle(.segmented)
                .frame(width: 140)
            }

            ToolbarItemGroup(placement: .topBarTrailing) {
                if writing {
                    Button("Done") { writing = false }
                        .fontWeight(.semibold)
                } else if mode == .draw {
                    Menu {
                        Button { undoToken += 1 } label: { Label("Undo", systemImage: "arrow.uturn.backward") }
                        Button(role: .destructive) { confirmClear = true } label: { Label("Clear", systemImage: "trash") }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                    }
                }
            }
        }
        .task(id: store.selectedDate) { await store.loadPage() }
        .onDisappear { Task { await store.savePage() } }
        .agendaOnChange(of: store.dailyNote) { _ in Task { await store.savePage() } }
        .confirmationDialog("Clear this drawing?", isPresented: $confirmClear) {
            Button("Clear Drawing", role: .destructive) {
                clearToken += 1
                store.ink.strokes.removeAll()
                store.ink.pencilKitData = nil
            }
        }
    }
}

struct WritingPageView: View {
    @EnvironmentObject var store: AgendaStore
    let fixedDate: String?
    @FocusState private var focused: Bool
    @State private var preview = false

    init(date: String? = nil) { fixedDate = date }

    var body: some View {
        Group {
            if preview && store.markdown {
                ScrollView {
                    Text((try? AttributedString(markdown: store.dailyNote)) ?? AttributedString(store.dailyNote))
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, store.pageMargin)
                        .padding(.vertical)
                }
            } else {
                TextEditor(text: $store.dailyNote)
                    .font(.system(size: store.editorFontSize))
                    .padding(.horizontal, store.pageMargin)
                    .focused($focused)
            }
        }
        .navigationTitle(AgendaDate.title(fixedDate ?? store.selectedDate))
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItemGroup(placement: .topBarTrailing) {
                if store.markdown {
                    Button { preview.toggle() } label: { Image(systemName: preview ? "square.and.pencil" : "eye") }
                }
                if focused {
                    Button("Done") { focused = false }
                        .fontWeight(.semibold)
                } else {
                    Button("Save") { Task { await store.savePage() } }
                }
            }
        }
        .task {
            if let fixedDate { store.selectedDate = fixedDate }
            await store.loadPage()
        }
        .onDisappear { Task { await store.savePage() } }
    }
}

struct DrawingPageView: View {
    @EnvironmentObject var store: AgendaStore
    @State private var drawing = true
    @State private var confirmClear = false
    @State private var undoToken = 0
    @State private var clearToken = 0

    var body: some View {
        InkCanvas(
            document: $store.ink,
            drawing: $drawing,
            pencilOnly: store.penOnly,
            undoToken: undoToken,
            clearToken: clearToken
        )
        .navigationTitle(AgendaDate.title(store.selectedDate))
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItemGroup(placement: .topBarTrailing) {
                Button { drawing.toggle() } label: { Image(systemName: drawing ? "pencil.tip.crop.circle.fill" : "hand.draw") }
                Menu {
                    Button { undoToken += 1 } label: { Label("Undo", systemImage: "arrow.uturn.backward") }
                    Button(role: .destructive) { confirmClear = true } label: { Label("Clear", systemImage: "trash") }
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
            }
        }
        .task { await store.loadPage() }
        .onDisappear { Task { await store.savePage() } }
        .confirmationDialog("Clear this drawing?", isPresented: $confirmClear, titleVisibility: .visible) {
            Button("Clear Drawing", role: .destructive) {
                clearToken += 1
                store.ink.strokes.removeAll()
                store.ink.pencilKitData = nil
            }
        }
    }
}

struct LibraryView: View {
    @EnvironmentObject var store: AgendaStore
    @State private var query = ""
    @State private var settings = false
    @State private var addSpace = false

    var body: some View {
        List {
            if !query.isEmpty {
                Section("Results") { ForEach(store.searchResults) { ItemRow(item: $0) } }
            } else {
                Section {
                    NavigationLink(value: LibraryFilter.inbox) { Label("Inbox", systemImage: "tray") }
                    NavigationLink(value: LibraryFilter.all) { Label("All Items", systemImage: "list.bullet") }
                    NavigationLink(value: LibraryFilter.notes) { Label("Daily Notes", systemImage: "doc.text") }
                    NavigationLink(value: LibraryFilter.routines) { Label("Routines", systemImage: "repeat") }
                }
                if store.showSpaces {
                    Section("Spaces") {
                        ForEach(store.spaces) { space in NavigationLink(value: LibraryFilter.space(space.id)) { Label(space.name, systemImage: space.icon ?? "folder") } }
                        Button { addSpace = true } label: { Label("New Space", systemImage: "plus") }
                    }
                }
                Section("More") { NavigationLink(value: LibraryFilter.completed) { Label("Completed", systemImage: "checkmark.circle") } }
            }
        }
        .navigationTitle("Library")
        .searchable(text: $query, prompt: "Search Library")
        .task(id: query) { await store.search(query) }
        .task { await store.refresh() }
        .navigationDestination(for: LibraryFilter.self) { LibraryDestination(filter: $0) }
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button { settings = true } label: { Image(systemName: "gearshape") }
            }
        }
        .sheet(isPresented: $settings) { NavigationStack { SettingsHubView() } }
        .alert("New Space", isPresented: $addSpace) {
            TextField("Name", text: $query)
            Button("Create") { Task { await store.saveSpace(name: query, color: "#007AFF"); query = "" } }
            Button("Cancel", role: .cancel) { query = "" }
        }
    }
}

struct LibraryDestination: View {
    let filter: LibraryFilter
    @EnvironmentObject var store: AgendaStore

    var body: some View {
        Group {
            switch filter {
            case .notes:
                List(store.notes) { note in
                    VStack(alignment: .leading) {
                        Text(AgendaDate.title(note.date))
                        Text(note.bodyText).lineLimit(2).foregroundStyle(.secondary)
                    }
                }
                .navigationTitle("Daily Notes")
            case .routines:
                RoutinesView()
            default:
                List(filtered) { ItemRow(item: $0) }
                    .navigationTitle(title)
            }
        }
        .task { await store.refresh() }
    }

    var filtered: [AgendaItem] {
        switch filter {
        case .inbox: return store.allItems.filter { $0.spaceId == nil }
        case .completed: return store.allItems.filter { $0.completed == true }
        case .space(let id): return store.allItems.filter { $0.spaceId == id }
        default: return store.allItems
        }
    }

    var title: String {
        switch filter {
        case .inbox: "Inbox"
        case .completed: "Completed"
        case .space(let id): store.spaces.first { $0.id == id }?.name ?? "Space"
        default: "All Items"
        }
    }
}

struct RoutinesView: View {
    @EnvironmentObject var store: AgendaStore
    @Environment(\.dismiss) var dismiss
    @State private var name = ""

    var body: some View {
        List {
            Section("New Routine") {
                TextField("Name", text: $name)
                Button("Add") { Task { await store.saveRoutine(name: name, spaceId: nil); name = "" } }
                    .disabled(name.isEmpty)
            }
            Section("Active") {
                ForEach(store.routines) { r in
                    Button { Task { await store.toggleRoutine(r) } } label: {
                        Label(r.routine.name, systemImage: r.completed ? "checkmark.circle.fill" : "circle")
                    }
                }
            }
        }
        .navigationTitle("Routines")
        .toolbar { Button("Done") { dismiss() } }
        .task { await store.refresh() }
    }
}

struct LockView: View {
    @EnvironmentObject var store: AgendaStore
    @EnvironmentObject var services: NativeServices

    var body: some View {
        VStack(spacing: 18) {
            Image(systemName: "lock.fill").font(.system(size: 44))
            Text("Agenda Locked").font(.title2.bold())
            Button("Unlock") { Task { await store.unlockIfNeeded(using: services) } }
                .buttonStyle(.borderedProminent)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(.regularMaterial)
    }
}

struct ItemRow: View {
    let item: AgendaItem
    var body: some View {
        VStack(alignment: .leading) {
            Text(item.title)
            Text("\(item.date) · \(item.type.rawValue.capitalized)").font(.caption).foregroundStyle(.secondary)
        }
    }
}
