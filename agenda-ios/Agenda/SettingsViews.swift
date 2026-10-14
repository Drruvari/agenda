import SwiftUI
import UserNotifications

struct SettingsHubView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        List {
            Section {
                NavigationLink { GeneralSettingsView() } label: { Label("General", systemImage: "gearshape") }
                NavigationLink { EditorSettingsView() } label: { Label("Editor", systemImage: "textformat") }
                NavigationLink { SpacesSettingsView() } label: { Label("Spaces", systemImage: "folder") }
                NavigationLink { IntegrationsSettingsView() } label: { Label("Integrations", systemImage: "puzzlepiece.extension") }
            } header: { Text("Preferences") }
            Section {
                NavigationLink { ExportSettingsView() } label: { Label("Export & Backup", systemImage: "square.and.arrow.up") }
            } header: { Text("Data") }
            Section {
                NavigationLink { PrivacySettingsView() } label: { Label("Privacy", systemImage: "hand.raised") }
                NavigationLink { NotificationSettingsView() } label: { Label("Notifications", systemImage: "bell") }
                NavigationLink { AboutSettingsView() } label: { Label("About", systemImage: "info.circle") }
            } header: { Text("Agenda") }
        }
        .navigationTitle("Settings")
        .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
        .nativeScrollEdge()
    }
}

struct GeneralSettingsView: View {
    @EnvironmentObject private var store: AgendaStore
    var body: some View {
        Form {
            Section("Appearance") {
                Picker("Theme", selection: $store.appearance) { Text("System").tag("system"); Text("Light").tag("light"); Text("Dark").tag("dark") }
                Picker("Accent", selection: $store.accent) { ForEach(["blue","red","purple","green","orange","pink","brown"], id: \.self) { Text($0.capitalized).tag($0) } }
            }
            Section("Agenda") {
                Toggle("Show Completed", isOn: $store.showCompleted)
            }
        }.navigationTitle("General").nativeScrollEdge()
    }
}

struct EditorSettingsView: View {
    @EnvironmentObject private var store: AgendaStore
    var body: some View {
        Form {
            Section("Today’s Page") {
                Stepper("Font Size: \(Int(store.editorFontSize)) pt", value: $store.editorFontSize, in: 12...28)
                Stepper("Page Margin: \(Int(store.pageMargin)) pt", value: $store.pageMargin, in: 8...48, step: 2)
            }
            Section("New Items") {
                Picker("Default Type", selection: $store.defaultType) { Text("Task").tag("task"); Text("Event").tag("event"); Text("Note").tag("note") }
                Picker("Default Space", selection: $store.defaultSpace) { Text("Inbox").tag(""); ForEach(store.spaces) { Text($0.name).tag($0.id) } }
            }
            Section("Page") { Toggle("Markdown Preview", isOn: $store.markdown);Toggle("Draw with Apple Pencil Only",isOn:$store.penOnly) }
            Section { Button("Restore Defaults") { store.resetEditorSettings() } }
        }.navigationTitle("Editor").task { await store.refresh() }.nativeScrollEdge()
    }
}

struct IntegrationsSettingsView:View {
    @EnvironmentObject private var store:AgendaStore
    @EnvironmentObject private var services:NativeServices
    var body:some View {Form{Section("Calendar"){Toggle("Show Calendar Events",isOn:$store.calendarEnabled).agendaOnChange(of:store.calendarEnabled){enabled in guard enabled else{return};Task{let granted=await services.enableCalendar();store.calendarEnabled=granted}};Text("Agenda asks for Calendar access only when you enable this option.").font(.footnote).foregroundStyle(.secondary)};Section("Contacts"){Toggle("Show Birthdays",isOn:$store.birthdaysEnabled).agendaOnChange(of:store.birthdaysEnabled){enabled in guard enabled else{return};Task{let granted=await services.enableBirthdays();store.birthdaysEnabled=granted}}};Section("Notifications"){Toggle("Task Reminders",isOn:$store.notificationsEnabled).agendaOnChange(of:store.notificationsEnabled){enabled in guard enabled else{return};Task{await services.requestNotifications();await services.refreshNotificationStatus();store.notificationsEnabled = services.notificationStatus == .authorized}}}}.navigationTitle("Integrations").nativeScrollEdge()}
}

struct SpacesSettingsView: View {
    @EnvironmentObject private var store: AgendaStore
    @State private var newName = ""
    var body: some View {
        List {
            Section("New Space") { TextField("Name", text: $newName); Button("Add Space") { let name=newName;newName="";Task{await store.saveSpace(name:name,color:"#007AFF")} }.disabled(newName.trimmingCharacters(in:.whitespaces).isEmpty) }
            Section("Your Spaces") { ForEach(store.spaces) { space in LabeledContent { Button(role:.destructive){Task{await store.deleteSpace(space)}}label:{Image(systemName:"trash")} } label:{Label(space.name,systemImage:space.icon ?? "folder")} } }
        }.navigationTitle("Spaces").task{await store.refresh()}.nativeScrollEdge()
    }
}

struct SyncSettingsView: View {
    @EnvironmentObject private var store: AgendaStore
    @State private var updated: Date?
    var body: some View {
        Form {
            Section("On This Device") { LabeledContent("Storage", value:"Local SQLite"); LabeledContent("Items",value:"\(store.allItems.count)");LabeledContent("Notes",value:"\(store.notes.count)");if let updated{LabeledContent("Last Updated",value:updated.formatted(date:.abbreviated,time:.shortened))} }
            Section("Options") { Toggle("Index Daily Notes",isOn:$store.indexNotes);Toggle("Open Today Shortcut",isOn:$store.todayShortcut) }
            Section("Maintenance") { Button("Update Local Index") { Task { await store.refresh(); updated = .now } } }
        }.navigationTitle("Sync").task{await store.refresh()}.nativeScrollEdge()
    }
}

struct ExportSettingsView: View {
    @EnvironmentObject private var store: AgendaStore
    var body: some View {
        Form {
            Section("Today’s Page") { ShareLink(item:store.dailyNote){Label("Share Page",systemImage:"square.and.arrow.up")};ShareLink(item:store.exportText()){Label("Export Agenda as Text",systemImage:"doc.plaintext")} }
            Section("Backup") { ShareLink(item:backup,preview:SharePreview("Agenda Backup")){Label("Export Local Backup",systemImage:"externaldrive")};Text("The backup includes loaded agenda items and notes in a readable JSON file.").font(.footnote).foregroundStyle(.secondary) }
        }.navigationTitle("Export & Backup").task{await store.refresh();await store.loadPage()}.nativeScrollEdge()
    }
    private var backup:String { let payload:[String:Any] = ["version":1,"exportedAt":ISO8601DateFormatter().string(from:.now),"items":store.allItems.map{["id":$0.id,"title":$0.title,"date":$0.date,"type":$0.type.rawValue]},"notes":store.notes.map{["date":$0.date,"text":$0.bodyText]}];let data=try? JSONSerialization.data(withJSONObject:payload,options:.prettyPrinted);return String(data:data ?? Data(),encoding:.utf8) ?? "{}" }
}

struct PrivacySettingsView: View {
    @EnvironmentObject private var store: AgendaStore
    var body: some View { Form { Section("App Lock") { Toggle("Require Face ID or Touch ID",isOn:$store.appLock);Picker("Lock",selection:$store.lockDelay){Text("Immediately").tag("immediately");Text("After 30 Seconds").tag("30");Text("After 1 Minute").tag("60");Text("After 5 Minutes").tag("300")}.disabled(!store.appLock) };Section("Storage"){LabeledContent("Database",value:"agenda.v3.db");Text("Your agenda stays on this device unless you export it.").foregroundStyle(.secondary)}}.navigationTitle("Privacy").nativeScrollEdge() }
}

struct NotificationSettingsView: View {
    @EnvironmentObject private var store: AgendaStore
    @EnvironmentObject private var services: NativeServices
    var body: some View { Form { Section("Permission") { LabeledContent("Notifications",value:status);if services.notificationStatus == .notDetermined{Button("Allow Notifications"){Task{await services.requestNotifications()}}} };Section("Lock Screen"){Picker("Show Previews",selection:$store.notificationPreview){Text("Full").tag("full");Text("Title Only").tag("title");Text("Private").tag("private")}}}.navigationTitle("Notifications").task{await services.refreshNotificationStatus()}.nativeScrollEdge() }
    private var status:String { switch services.notificationStatus {case .authorized,.provisional,.ephemeral:"Allowed";case .denied:"Blocked in Settings";case .notDetermined:"Not Requested";@unknown default:"Unknown"} }
}

struct AboutSettingsView: View {
    var body: some View { List { Section { VStack(spacing:10){AgendaLogo(size:58);Text("Agenda").font(.largeTitle.bold());Text("Your agenda belongs on your phone.").foregroundStyle(.secondary);Text("Version 1.0").font(.footnote).foregroundStyle(.secondary)}.frame(maxWidth:.infinity).padding(.vertical) };Section("Local by Design"){Text("Tasks, notes, routines, and drawings stay on this device. Agenda works offline and requires no account.")};Section("What That Enables"){Label("Private by default",systemImage:"lock");Label("Works without a network",systemImage:"wifi.slash");Label("Native calendar and reminder integration",systemImage:"calendar")}}.navigationTitle("About").nativeScrollEdge() }
}
