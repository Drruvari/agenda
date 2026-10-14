import EventKit
import Contacts
import UserNotifications
import LocalAuthentication
import Foundation

@MainActor
final class NativeServices: ObservableObject {
    @Published var events:[DeviceEvent]=[]
    @Published var birthdays:[DeviceEvent]=[]
    @Published var calendarDenied=false
    @Published var notificationStatus:UNAuthorizationStatus = .notDetermined
    private let eventStore=EKEventStore()

    func load(for date:String, calendarEnabled:Bool, birthdaysEnabled:Bool) async {
        let day=AgendaDate.date(date), calendar=Calendar.current
        let start=calendar.startOfDay(for:day), end=calendar.date(byAdding:.day,value:1,to:start)!
        let eventStatus=EKEventStore.authorizationStatus(for:.event)
        let calendarAllowed:Bool
        if #available(iOS 17.0,*) { calendarAllowed = eventStatus == .fullAccess } else { calendarAllowed = eventStatus == .authorized }
        if calendarEnabled && calendarAllowed {
            events=eventStore.events(matching:eventStore.predicateForEvents(withStart:start,end:end,calendars:nil)).map {
                DeviceEvent(id:$0.eventIdentifier,title:$0.title ?? "Event",start:$0.startDate,end:$0.endDate,allDay:$0.isAllDay,calendar:$0.calendar.title,isBirthday:$0.calendar.type == .birthday)
            }
        } else { events=[] }
        if birthdaysEnabled && CNContactStore.authorizationStatus(for:.contacts) == .authorized { birthdays = await contactsBirthdays(on:day,requestAccess:false) } else { birthdays=[] }
    }

    private func contactsBirthdays(on date:Date,requestAccess:Bool) async -> [DeviceEvent] {
        let store=CNContactStore(); if requestAccess { guard (try? await store.requestAccess(for:.contacts)) == true else{return []} }
        let keys=[CNContactGivenNameKey,CNContactFamilyNameKey,CNContactBirthdayKey] as [CNKeyDescriptor]
        let request=CNContactFetchRequest(keysToFetch:keys); var result:[DeviceEvent]=[]
        try? store.enumerateContacts(with:request) { contact,_ in
            guard let birthday=contact.birthday, birthday.month == Calendar.current.component(.month,from:date), birthday.day == Calendar.current.component(.day,from:date) else{return}
            let name=CNContactFormatter.string(from:contact,style:.fullName) ?? "Birthday"
            result.append(DeviceEvent(id:contact.identifier,title:"\(name)’s Birthday",start:date,end:date,allDay:true,calendar:"Contacts",isBirthday:true))
        }
        return result
    }

    func enableCalendar() async -> Bool {
        do {
            return try await eventStore.requestFullAccessToEvents()
        } catch {
            return false
        }
    }
    func enableBirthdays() async -> Bool { (try? await CNContactStore().requestAccess(for:.contacts)) == true }

    func createCalendarEvent(for item:AgendaItem) async -> String? {
        guard item.type == .event else{return nil}; let event=EKEvent(eventStore:eventStore); event.title=item.title; event.notes=item.details; event.calendar=eventStore.defaultCalendarForNewEvents
        let date=AgendaDate.date(item.date); if let time=item.time { let parts=time.split(separator:":").compactMap{Int($0)}; event.startDate=Calendar.current.date(bySettingHour:parts.first ?? 0,minute:parts.dropFirst().first ?? 0,second:0,of:date) } else { event.startDate=date; event.isAllDay=true }
        event.endDate=Calendar.current.date(byAdding:.minute,value:item.durationMinutes ?? 30,to:event.startDate)!
        do { try eventStore.save(event,span:.thisEvent); return event.eventIdentifier } catch{return nil}
    }

    func scheduleReminder(for item:AgendaItem) async -> String? {
        guard let raw=item.reminderAt,let date=ISO8601DateFormatter().date(from:raw),date > .now else{return nil}
        let center=UNUserNotificationCenter.current(); guard await center.notificationSettings().authorizationStatus == .authorized else{return nil}
        let content=UNMutableNotificationContent(); content.title=item.title; content.body=item.details ?? "Agenda reminder"; content.sound = .default
        let id=UUID().uuidString; try? await center.add(UNNotificationRequest(identifier:id,content:content,trigger:UNCalendarNotificationTrigger(dateMatching:Calendar.current.dateComponents([.year,.month,.day,.hour,.minute],from:date),repeats:false))); return id
    }

    func refreshNotificationStatus() async { notificationStatus = await UNUserNotificationCenter.current().notificationSettings().authorizationStatus }
    func requestNotifications() async { _ = try? await UNUserNotificationCenter.current().requestAuthorization(options:[.alert,.sound,.badge]); await refreshNotificationStatus() }

    func authenticate() async -> Bool { let context=LAContext(); var error:NSError?; guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics,error:&error) else{return false}; return (try? await context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics,localizedReason:"Unlock your private agenda")) == true }
}
