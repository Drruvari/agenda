import WidgetKit
import SwiftUI

struct AgendaWidgetEntry:TimelineEntry {let date:Date;let items:[[String:String]]}
struct AgendaWidgetProvider:TimelineProvider {
    func placeholder(in context:Context)->AgendaWidgetEntry{AgendaWidgetEntry(date:.now,items:[["title":"Plan the day","time":"09:00","done":"0"]])}
    func getSnapshot(in context:Context,completion:@escaping(AgendaWidgetEntry)->Void){completion(entry())}
    func getTimeline(in context:Context,completion:@escaping(Timeline<AgendaWidgetEntry>)->Void){completion(Timeline(entries:[entry()],policy:.after(Date().addingTimeInterval(900))))}
    private func entry()->AgendaWidgetEntry{AgendaWidgetEntry(date:.now,items:UserDefaults(suiteName:"group.com.drruvari.agenda")?.array(forKey:"agenda.widget.items") as? [[String:String]] ?? [])}
}
struct AgendaWidgetView:View {let entry:AgendaWidgetEntry
    var body:some View {VStack(alignment:.leading,spacing:7){Text("Today").font(.headline);if entry.items.isEmpty{Text("A clear day").foregroundStyle(.secondary)}else{ForEach(Array(entry.items.enumerated()),id:\.offset){_,item in HStack{Image(systemName:item["done"] == "1" ? "checkmark.circle.fill":"circle");Text(item["title"] ?? "").lineLimit(1);Spacer();Text(item["time"] ?? "").font(.caption).foregroundStyle(.secondary)}}}}.padding().background(Color(uiColor:.systemBackground))}
}
@main struct AgendaWidget:Widget {var body:some WidgetConfiguration{StaticConfiguration(kind:"AgendaWidget",provider:AgendaWidgetProvider()){AgendaWidgetView(entry:$0)}.configurationDisplayName("Agenda").description("Today’s agenda at a glance").supportedFamilies([.systemSmall,.systemMedium,.systemLarge])}}
