import type { DeviceBirthday } from '@/native/contacts/deviceBirthdays';

import type { DeviceCalendarEvent } from './deviceCalendar';

export type NativeBirthdayEntry = {
  id: string;
  title: string;
  subtitle: string;
};

function birthdayKey(title: string): string {
  return title
    .toLocaleLowerCase()
    .replace(/(?:'s|’s)?\s+birthday/g, '')
    .replace(/birthday/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '');
}

export function mergeNativeBirthdays(
  events: DeviceCalendarEvent[],
  contacts: DeviceBirthday[],
): NativeBirthdayEntry[] {
  const calendarBirthdays = events.filter((event) => event.kind === 'birthday');
  const known = new Set(calendarBirthdays.map((event) => birthdayKey(event.title)));

  return [
    ...calendarBirthdays.map((event) => ({
      id: `calendar-birthday:${event.id}`,
      title: event.title,
      subtitle: event.calendarTitle ?? 'Birthdays',
    })),
    ...contacts
      .filter((contact) => !known.has(birthdayKey(contact.name)))
      .map((contact) => ({
        id: `contact-birthday:${contact.id}`,
        title: `${contact.name}’s birthday`,
        subtitle: contact.year ? `Contacts · born ${contact.year}` : 'Contacts',
      })),
  ];
}
