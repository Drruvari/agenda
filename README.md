# Agenda

Agenda is a local-first planner with fully native iOS and Android applications.

- `agenda-ios`: Swift 6, SwiftUI and SQLite
- `agenda-android`: Kotlin, Jetpack Compose and SQLite

Both applications use the `com.drruvari.agenda` identity and preserve the existing `agenda.v3.db` schema.

The iOS app provides:

- three focused destinations: Agenda, Page, and Library
- task, event, note, space, and routine management
- date navigation, completion tracking, priorities, reminders, and calendar mirroring
- device calendar events and contact birthdays
- daily text pages and `ink-v1` freehand drawing
- Inbox, All Items, Completed, Daily Notes, Spaces, and integrated search
- biometric privacy lock, appearance settings, local export, and WidgetKit widgets

## Build iOS

Open `agenda-ios/AgendaNative.xcodeproj` in Xcode, select the `AgendaNative` scheme and run.

## Build Android

Open `agenda-android` in Android Studio or run:

```bash
cd agenda-android
./gradlew assembleDebug
./gradlew testDebugUnitTest
```

## Data compatibility

iOS continues to use the historical `Documents/SQLite/agenda.v3.db` location. Android uses the standard application database directory. Installing these apps as signed updates with the same store identity preserves existing planner data.
