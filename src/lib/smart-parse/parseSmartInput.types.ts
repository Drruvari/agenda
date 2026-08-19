import type { ItemType, Priority } from '@/data/schema/types';

export type SmartParseResult = {
  title: string;
  type?: ItemType;
  date?: string;
  time?: string;
  durationMinutes?: number;
  spaceName?: string;
  priority?: Priority;
};

export type SmartTokenKind = 'type' | 'date' | 'time' | 'space' | 'priority';

export type SmartToken = {
  kind: SmartTokenKind;
  raw: string;
  start: number;
  end: number;
};

export type SmartTokenSegment = {
  text: string;
  kind?: SmartTokenKind;
};
