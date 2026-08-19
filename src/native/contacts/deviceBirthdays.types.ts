export type BirthdayAccessState = 'granted' | 'denied' | 'undetermined' | 'unavailable';

export type DeviceBirthday = {
  id: string;
  name: string;
  year?: number;
};
