export type CalendarAccessState = 'granted' | 'denied' | 'undetermined' | 'unavailable';

export type DeviceCalendarEvent = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
  notes?: string;
  calendarTitle?: string;
  kind: 'event' | 'birthday';
};

export type CreateDeviceEventInput = {
  title: string;
  details?: string;
  startDate: Date;
  endDate: Date;
  allDay: boolean;
};

export async function getCalendarAccessState(): Promise<CalendarAccessState> {
  return 'unavailable';
}

export async function requestCalendarAccess(): Promise<CalendarAccessState> {
  return 'unavailable';
}

export async function listDeviceEvents(
  _startDate: Date,
  _endDate: Date,
): Promise<DeviceCalendarEvent[]> {
  return [];
}

export async function createDeviceEvent(_input: CreateDeviceEventInput): Promise<string | null> {
  return null;
}
