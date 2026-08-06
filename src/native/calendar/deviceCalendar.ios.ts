import * as Calendar from 'expo-calendar';

import type {
  CalendarAccessState,
  CreateDeviceEventInput,
  DeviceCalendarEvent,
} from './deviceCalendar';

function mapPermission(status: string, canAskAgain: boolean): CalendarAccessState {
  if (status === 'granted') return 'granted';
  if (status === 'undetermined' || canAskAgain) return 'undetermined';
  return 'denied';
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
  if ((await getCalendarAccessState()) !== 'granted') return [];

  const calendars = await Calendar.getCalendars(Calendar.EntityTypes.EVENT);
  const visible = calendars.filter((calendar) => calendar.allowsModifications || calendar.title);
  const events = await Calendar.listEvents(visible, startDate, endDate);
  const titles = new Map(calendars.map((calendar) => [calendar.id, calendar.title]));
  const birthdayCalendarIds = new Set(
    calendars
      .filter((calendar) => calendar.type === Calendar.CalendarType.BIRTHDAYS)
      .map((calendar) => calendar.id),
  );

  return events.map((event) => ({
    id: event.id,
    title: event.title,
    startDate: new Date(event.startDate).toISOString(),
    endDate: new Date(event.endDate).toISOString(),
    allDay: event.allDay,
    notes: event.notes || undefined,
    calendarTitle: titles.get(event.calendarId),
    kind: birthdayCalendarIds.has(event.calendarId) ? 'birthday' : 'event',
  }));
}

export async function createDeviceEvent(input: CreateDeviceEventInput): Promise<string | null> {
  if ((await requestCalendarAccess()) !== 'granted') return null;

  const calendars = await Calendar.getCalendars(Calendar.EntityTypes.EVENT);
  const calendar =
    calendars.find((entry) => entry.allowsModifications) ?? Calendar.getDefaultCalendarSync();
  const event = await calendar.createEvent({
    title: input.title,
    notes: input.details ?? '',
    startDate: input.startDate,
    endDate: input.endDate,
    allDay: input.allDay,
  });
  return event.id;
}
