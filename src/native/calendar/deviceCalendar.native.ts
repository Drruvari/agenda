import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';

import type {
  CalendarAccessState,
  CreateDeviceEventInput,
  DeviceCalendarEvent,
} from './deviceCalendar.types';

function mapPermission(status: string, canAskAgain: boolean): CalendarAccessState {
  if (status === 'granted') {
    return 'granted';
  }

  if (status === 'undetermined' || canAskAgain) {
    return 'undetermined';
  }

  return 'denied';
}

function isBirthdayCalendar(calendar: Calendar.ExpoCalendar): boolean {
  if (Platform.OS === 'ios' && calendar.type === Calendar.CalendarType.BIRTHDAYS) {
    return true;
  }

  const title = calendar.title.toLowerCase();

  return (
    title.includes('birthday') || title.includes('anniversaire') || title.includes('cumpleaños')
  );
}

function mapEvent(
  event: Calendar.ExpoCalendarEvent,
  calendarTitles: Map<string, string>,
  birthdayCalendarIds: Set<string>,
): DeviceCalendarEvent | null {
  const title = event.title?.trim();

  if (!event.id || !title) {
    return null;
  }

  return {
    id: event.id,
    title,
    startDate: new Date(event.startDate).toISOString(),
    endDate: new Date(event.endDate).toISOString(),
    allDay: Boolean(event.allDay),
    notes: event.notes || undefined,
    calendarTitle: calendarTitles.get(event.calendarId),
    kind:
      birthdayCalendarIds.has(event.calendarId) || /\bbirthday\b/i.test(title)
        ? 'birthday'
        : 'event',
  };
}

function getWritableCalendar(calendars: Calendar.ExpoCalendar[]): Calendar.ExpoCalendar | null {
  const writable = calendars.filter((calendar) => calendar.allowsModifications);

  if (Platform.OS === 'android') {
    return writable.find((calendar) => calendar.isPrimary) ?? writable[0] ?? null;
  }

  return writable[0] ?? Calendar.getDefaultCalendarSync() ?? null;
}

async function ensureCalendarAccess(): Promise<boolean> {
  const state = await getCalendarAccessState();

  if (state === 'granted') {
    return true;
  }

  if (state !== 'undetermined') {
    return false;
  }

  return (await requestCalendarAccess()) === 'granted';
}

export async function getCalendarAccessState(): Promise<CalendarAccessState> {
  try {
    const permission = await Calendar.getCalendarPermissions();

    return mapPermission(permission.status, permission.canAskAgain);
  } catch {
    return 'unavailable';
  }
}

export async function requestCalendarAccess(): Promise<CalendarAccessState> {
  try {
    const permission = await Calendar.requestCalendarPermissions();

    return mapPermission(permission.status, permission.canAskAgain);
  } catch {
    return 'unavailable';
  }
}

export async function listDeviceEvents(
  startDate: Date,
  endDate: Date,
): Promise<DeviceCalendarEvent[]> {
  if ((await getCalendarAccessState()) !== 'granted') {
    return [];
  }

  try {
    const calendars = await Calendar.getCalendars(Calendar.EntityTypes.EVENT);

    if (calendars.length === 0) {
      return [];
    }

    const events = await Calendar.listEvents(calendars, startDate, endDate);

    const calendarTitles = new Map(calendars.map((calendar) => [calendar.id, calendar.title]));

    const birthdayCalendarIds = new Set(
      calendars.filter(isBirthdayCalendar).map((calendar) => calendar.id),
    );

    return events.flatMap((event) => {
      const mapped = mapEvent(event, calendarTitles, birthdayCalendarIds);

      return mapped ? [mapped] : [];
    });
  } catch {
    return [];
  }
}

export async function createDeviceEvent(input: CreateDeviceEventInput): Promise<string | null> {
  if (!(await ensureCalendarAccess())) {
    return null;
  }

  try {
    const calendars = await Calendar.getCalendars(Calendar.EntityTypes.EVENT);

    const calendar = getWritableCalendar(calendars);

    if (!calendar) {
      return null;
    }

    const event = await calendar.createEvent({
      title: input.title,
      notes: input.details,
      startDate: input.startDate,
      endDate: input.endDate,
      allDay: input.allDay,
    });

    return event.id;
  } catch {
    return null;
  }
}

export async function deleteDeviceEvent(id: string): Promise<void> {
  const event = await Calendar.ExpoCalendarEvent.get(id);

  await event.delete();
}
