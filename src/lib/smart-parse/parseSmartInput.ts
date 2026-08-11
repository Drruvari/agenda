/**
 * Smart parsing: maps predictable free-text shorthand into structured create fields.
 * The raw input remains untouched; recognized syntax is represented by exact ranges.
 */
import { addDays, toLocalDateString } from '@/data/schema/ids';
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

const COMMAND_PATTERN = /(^|\s)\/(task|event|note)(?=\s|$)/giu;
const SPACE_PATTERN = /(^|\s)#([\p{L}\p{N}_-]+)(?=\s|$)/gu;
const PRIORITY_PATTERN = /(^|\s)(!{1,3})(?=\s|$)/g;
const DAY_PATTERN =
  /(^|\s)(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?=\s|$)/giu;
const TIME_PATTERN =
  /(^|\s)((?:[01]?\d|2[0-3]):[0-5]\d|(?:1[0-2]|0?[1-9])(?::[0-5]\d)?\s*(?:am|pm))(?=\s|$)/giu;
const DURATION_PATTERN = /(^|\s)(?:\d{1,2}h(?:\d{1,2}m)?|\d{1,3}m)(?=\s|$)/giu;

const WEEKDAY_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

function nextWeekday(referenceDate: string, weekday: string): string {
  const reference = new Date(`${referenceDate}T12:00:00`);
  const target = WEEKDAY_INDEX[weekday];
  const daysAhead = (target - reference.getDay() + 7) % 7 || 7;
  return addDays(referenceDate, daysAhead);
}

function normalizeTime(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
    const [h, m] = trimmed.split(':');
    return `${h.padStart(2, '0')}:${m}`;
  }

  const match = trimmed.match(/^(1[0-2]|0?[1-9])(?::([0-5]\d))?\s*(am|pm)$/);
  if (!match) return trimmed;

  let hour = Number(match[1]);
  const minutes = match[2] ?? '00';
  const meridian = match[3];
  if (meridian === 'pm' && hour < 12) hour += 12;
  if (meridian === 'am' && hour === 12) hour = 0;
  return `${String(hour).padStart(2, '0')}:${minutes}`;
}

function priorityFromBang(token: string): Priority {
  if (token === '!!!') return 'high';
  if (token === '!!') return 'medium';
  return 'low';
}

function tokensFromPattern(text: string, pattern: RegExp, kind: SmartTokenKind): SmartToken[] {
  return [...text.matchAll(pattern)].map((match) => {
    const leadingWhitespace = match[1]?.length ?? 0;
    const start = (match.index ?? 0) + leadingWhitespace;
    const raw = match[0].slice(leadingWhitespace);
    return { kind, raw, start, end: start + raw.length };
  });
}

function maskTokenRanges(text: string, tokens: SmartToken[]): string {
  const characters = text.split('');
  for (const token of tokens) {
    for (let index = token.start; index < token.end; index += 1) characters[index] = ' ';
  }
  return characters.join('');
}

/** Returns recognized syntax with UTF-16 offsets matching TextInput selection offsets. */
export function lexSmartInput(input: string): SmartToken[] {
  const explicit = [
    ...tokensFromPattern(input, COMMAND_PATTERN, 'type'),
    ...tokensFromPattern(input, SPACE_PATTERN, 'space'),
    ...tokensFromPattern(input, PRIORITY_PATTERN, 'priority'),
  ];

  let masked = maskTokenRanges(input, explicit);
  const dates = tokensFromPattern(masked, DAY_PATTERN, 'date');
  masked = maskTokenRanges(masked, dates);
  const durations = tokensFromPattern(masked, DURATION_PATTERN, 'time');
  masked = maskTokenRanges(masked, durations);
  const times = tokensFromPattern(masked, TIME_PATTERN, 'time');

  return [...explicit, ...dates, ...durations, ...times].sort(
    (left, right) => left.start - right.start,
  );
}

/** Preserves the input exactly while splitting it into styled and default text spans. */
export function tokenizeSmartInput(input: string): SmartTokenSegment[] {
  const segments: SmartTokenSegment[] = [];
  let cursor = 0;

  for (const token of lexSmartInput(input)) {
    if (token.start > cursor) segments.push({ text: input.slice(cursor, token.start) });
    segments.push({ text: input.slice(token.start, token.end), kind: token.kind });
    cursor = token.end;
  }

  if (cursor < input.length) segments.push({ text: input.slice(cursor) });
  return segments;
}

function titleWithoutTokens(input: string, tokens: SmartToken[]): string {
  return maskTokenRanges(input, tokens).replace(/\s+/g, ' ').trim();
}

export function parseSmartInput(
  input: string,
  referenceDate = toLocalDateString(),
): SmartParseResult {
  const tokens = lexSmartInput(input);
  const result: SmartParseResult = { title: titleWithoutTokens(input, tokens) };

  const type = tokens.find((token) => token.kind === 'type');
  if (type) result.type = type.raw.slice(1).toLowerCase() as ItemType;

  const priorities = tokens.filter((token) => token.kind === 'priority');
  if (priorities.length) {
    const strongest = priorities.reduce((current, token) =>
      token.raw.length > current.raw.length ? token : current,
    );
    result.priority = priorityFromBang(strongest.raw);
  }

  const space = tokens.find((token) => token.kind === 'space');
  if (space) result.spaceName = space.raw.slice(1);

  const day = tokens.find((token) => token.kind === 'date');
  if (day) {
    const value = day.raw.toLowerCase();
    result.date =
      value === 'today'
        ? referenceDate
        : value === 'tomorrow'
          ? addDays(referenceDate, 1)
          : nextWeekday(referenceDate, value);
  }

  const timeTokens = tokens.filter((token) => token.kind === 'time');
  const clockTime = timeTokens.find((token) => !/^\d+(?:h(?:\d+m)?|m)$/i.test(token.raw));
  if (clockTime) result.time = normalizeTime(clockTime.raw);

  const duration = timeTokens.find((token) => /^\d+(?:h(?:\d+m)?|m)$/i.test(token.raw));
  if (duration) {
    const match = duration.raw.match(/^(?:(\d{1,2})h(?:(\d{1,2})m)?|(\d{1,3})m)$/i);
    if (match) {
      const minutes = Number(match[1] ?? 0) * 60 + Number(match[2] ?? 0) + Number(match[3] ?? 0);
      if (minutes > 0) result.durationMinutes = minutes;
    }
  }

  return result;
}
