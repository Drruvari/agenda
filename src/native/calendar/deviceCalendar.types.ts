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
