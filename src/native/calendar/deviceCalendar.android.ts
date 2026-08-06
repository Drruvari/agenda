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

function isBirthdayCalendar(calendar: { title?: string | null; name?: string | null }): boolean {
  const label = `${calendar.title ?? ''} ${calendar.name ?? ''}`.toLocaleLowerCase();
  return (
    label.includes('birthday') || label.includes('anniversaire') || label.includes('cumpleaños')
  );
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

  try {
    const calendars = await Calendar.getCalendars(Calendar.EntityTypes.EVENT);
    // Include every calendar with an id. Filtering to isVisible can hide synced
    // Google calendars (Birthdays, work calendars) that still have events.
    const searchable = calendars.filter((calendar) => !!calendar.id);
    if (searchable.length === 0) return [];

    const events = await Calendar.listEvents(searchable, startDate, endDate);
    const titles = new Map(calendars.map((calendar) => [calendar.id, calendar.title]));
    const birthdayCalendarIds = new Set(
      calendars.filter(isBirthdayCalendar).map((calendar) => calendar.id),
    );

    return events.flatMap((event) => {
      if (!event.id || !event.title) return [];
      const title = event.title.trim();
      if (!title) return [];
      const fromBirthdayCalendar = birthdayCalendarIds.has(event.calendarId);
      const looksLikeBirthday = /\bbirthday\b/i.test(title);
      return [
        {
          id: event.id,
          title,
          startDate: new Date(event.startDate).toISOString(),
          endDate: new Date(event.endDate).toISOString(),
          allDay: Boolean(event.allDay),
          notes: event.notes || undefined,
          calendarTitle: titles.get(event.calendarId),
          kind:
            fromBirthdayCalendar || looksLikeBirthday ? ('birthday' as const) : ('event' as const),
        },
      ];
    });
  } catch {
    return [];
  }
}

export async function createDeviceEvent(input: CreateDeviceEventInput): Promise<string | null> {
  if ((await requestCalendarAccess()) !== 'granted') return null;

  const calendars = await Calendar.getCalendars(Calendar.EntityTypes.EVENT);
  const writable = calendars.filter((calendar) => calendar.allowsModifications);
  const calendar = writable.find((entry) => entry.isPrimary) ?? writable[0];
  if (!calendar) return null;

  const event = await calendar.createEvent({
    title: input.title,
    notes: input.details ?? '',
    startDate: input.startDate,
    endDate: input.endDate,
    allDay: input.allDay,
  });
  return event.id;
}
