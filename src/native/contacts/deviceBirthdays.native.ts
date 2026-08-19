import {
  Contact,
  type ContactDate,
  ContactField,
  type ContactsPermissionResponse,
  type ExistingDate,
  getPermissionsAsync,
  requestPermissionsAsync,
} from 'expo-contacts';
import { Platform } from 'react-native';

import type { BirthdayAccessState, DeviceBirthday } from './deviceBirthdays.types';

const IOS_FIELDS = [ContactField.FULL_NAME, ContactField.BIRTHDAY] as const;

const ANDROID_FIELDS = [ContactField.FULL_NAME, ContactField.DATES] as const;

function mapPermission(permission: ContactsPermissionResponse): BirthdayAccessState {
  if (
    permission.granted ||
    permission.accessPrivileges === 'all' ||
    permission.accessPrivileges === 'limited'
  ) {
    return 'granted';
  }

  if (permission.status === 'undetermined' || permission.canAskAgain) {
    return 'undetermined';
  }

  return 'denied';
}

function matchesDate(birthday: ContactDate | null | undefined, date: Date): boolean {
  return birthday?.month === date.getMonth() + 1 && birthday.day === date.getDate();
}

function findBirthdayDate(dates: ExistingDate[]): ContactDate | undefined {
  return dates.find((entry) => entry.label?.toLowerCase().includes('birthday'))?.date;
}

function mapBirthday(
  id: string,
  name: string | null | undefined,
  birthday: ContactDate,
): DeviceBirthday | null {
  const trimmedName = name?.trim();

  if (!trimmedName) {
    return null;
  }

  return {
    id,
    name: trimmedName,
    ...(birthday.year !== undefined && {
      year: birthday.year,
    }),
  };
}

async function listIosBirthdays(date: Date): Promise<DeviceBirthday[]> {
  const contacts = await Contact.getAllDetails(IOS_FIELDS);

  return contacts.flatMap((contact) => {
    const birthday = contact.birthday;

    if (!birthday || !matchesDate(birthday, date)) {
      return [];
    }

    const mapped = mapBirthday(contact.id, contact.fullName, birthday);

    return mapped ? [mapped] : [];
  });
}

async function listAndroidBirthdays(date: Date): Promise<DeviceBirthday[]> {
  const contacts = await Contact.getAllDetails(ANDROID_FIELDS);

  return contacts.flatMap((contact) => {
    const birthday = findBirthdayDate(contact.dates);

    if (!birthday || !matchesDate(birthday, date)) {
      return [];
    }

    const mapped = mapBirthday(contact.id, contact.fullName, birthday);

    return mapped ? [mapped] : [];
  });
}

export async function getBirthdayAccessState(): Promise<BirthdayAccessState> {
  try {
    return mapPermission(await getPermissionsAsync());
  } catch {
    return 'unavailable';
  }
}

export async function requestBirthdayAccess(): Promise<BirthdayAccessState> {
  try {
    return mapPermission(await requestPermissionsAsync());
  } catch {
    return 'unavailable';
  }
}

export async function listDeviceBirthdays(date: Date): Promise<DeviceBirthday[]> {
  if ((await getBirthdayAccessState()) !== 'granted') {
    return [];
  }

  try {
    return Platform.OS === 'ios' ? await listIosBirthdays(date) : await listAndroidBirthdays(date);
  } catch {
    return [];
  }
}
