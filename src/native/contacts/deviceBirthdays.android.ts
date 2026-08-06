import * as Contacts from 'expo-contacts/legacy';

import type { BirthdayAccessState, DeviceBirthday } from './deviceBirthdays';

function mapPermission(permission: Contacts.ContactsPermissionResponse): BirthdayAccessState {
  if (permission.granted || permission.accessPrivileges === 'all') return 'granted';
  if (permission.status === 'undetermined' || permission.canAskAgain) return 'undetermined';
  return 'denied';
}

export async function getBirthdayAccessState(): Promise<BirthdayAccessState> {
  try {
    return mapPermission(await Contacts.getPermissionsAsync());
  } catch {
    return 'unavailable';
  }
}

export async function requestBirthdayAccess(): Promise<BirthdayAccessState> {
  try {
    return mapPermission(await Contacts.requestPermissionsAsync());
  } catch {
    return 'unavailable';
  }
}

export async function listDeviceBirthdays(date: Date): Promise<DeviceBirthday[]> {
  if ((await getBirthdayAccessState()) !== 'granted') return [];

  const { data } = await Contacts.getContactsAsync({
    fields: [Contacts.Fields.Name, Contacts.Fields.Birthday, Contacts.Fields.Dates],
  });
  return data.flatMap((contact) => {
    const birthday =
      contact.birthday ??
      contact.dates?.find((entry) => entry.label?.toLocaleLowerCase().includes('birthday'));
    if (!birthday || birthday.month !== date.getMonth() || birthday.day !== date.getDate()) {
      return [];
    }

    const name = contact.name?.trim();
    if (!name) return [];
    return [{ id: contact.id, name, year: birthday.year }];
  });
}
