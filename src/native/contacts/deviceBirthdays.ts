export type BirthdayAccessState = 'granted' | 'denied' | 'undetermined' | 'unavailable';

export type DeviceBirthday = {
  id: string;
  name: string;
  year?: number;
};

export async function getBirthdayAccessState(): Promise<BirthdayAccessState> {
  return 'unavailable';
}

export async function requestBirthdayAccess(): Promise<BirthdayAccessState> {
  return 'unavailable';
}

export async function listDeviceBirthdays(_date: Date): Promise<DeviceBirthday[]> {
  return [];
}
