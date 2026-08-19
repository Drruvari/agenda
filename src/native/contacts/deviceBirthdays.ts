import type { BirthdayAccessState, DeviceBirthday } from './deviceBirthdays.types';

export function getBirthdayAccessState(): Promise<BirthdayAccessState> {
  return Promise.resolve('unavailable');
}

export function requestBirthdayAccess(): Promise<BirthdayAccessState> {
  return Promise.resolve('unavailable');
}

export function listDeviceBirthdays(_date: Date): Promise<DeviceBirthday[]> {
  return Promise.resolve([]);
}
