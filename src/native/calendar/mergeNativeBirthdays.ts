import type { DeviceBirthday } from '@/native/contacts/deviceBirthdays.types';

import type { DeviceCalendarEvent } from './deviceCalendar.types';

export type NativeBirthdayEntry = {
  id: string;
  title: string;
  subtitle: string;
};

function birthdayKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/(?:'s|’s)?\s+birthday/g, '')
    .replace(/birthday/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '');
}

export function mergeNativeBirthdays(
  events: DeviceCalendarEvent[],
  contacts: DeviceBirthday[],
): NativeBirthdayEntry[] {
  const calendarBirthdays = events.filter((event) => event.kind === 'birthday');

  const knownBirthdays = new Set(calendarBirthdays.map((event) => birthdayKey(event.title)));

  const contactBirthdays = contacts
    .filter((contact) => !knownBirthdays.has(birthdayKey(contact.name)))
    .map((contact) => ({
      id: `contact-birthday:${contact.id}`,
      title: `${contact.name}’s birthday`,
      subtitle: contact.year !== undefined ? `Contacts · born ${contact.year}` : 'Contacts',
    }));

  return [
    ...calendarBirthdays.map((event) => ({
      id: `calendar-birthday:${event.id}`,
      title: event.title,
      subtitle: event.calendarTitle ?? 'Birthdays',
    })),
    ...contactBirthdays,
  ];
}
