import type {
  CalendarAccessState,
  CreateDeviceEventInput,
  DeviceCalendarEvent,
} from './deviceCalendar.types';

export function getCalendarAccessState(): Promise<CalendarAccessState> {
  return Promise.resolve('unavailable');
}

export function requestCalendarAccess(): Promise<CalendarAccessState> {
  return Promise.resolve('unavailable');
}

export function listDeviceEvents(_startDate: Date, _endDate: Date): Promise<DeviceCalendarEvent[]> {
  return Promise.resolve([]);
}

export function createDeviceEvent(_input: CreateDeviceEventInput): Promise<string | null> {
  return Promise.resolve(null);
}

export function deleteDeviceEvent(_id: string): Promise<void> {
  return Promise.resolve();
}
