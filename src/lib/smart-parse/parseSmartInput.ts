import { addDays, toLocalDateString } from '@/data/schema/ids';
import type { ItemType, Priority } from '@/data/schema/types';

import type {
  SmartParseResult,
  SmartToken,
  SmartTokenKind,
  SmartTokenSegment,
} from './parseSmartInput.types';

const COMMAND_PATTERN = /(^|\s)\/(task|event)(?=\s|$)/giu;

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
  const target = WEEKDAY_INDEX[weekday];

  if (target === undefined) {
    return referenceDate;
  }

  const reference = new Date(`${referenceDate}T12:00:00`);

  const daysAhead = (target - reference.getDay() + 7) % 7 || 7;

  return addDays(referenceDate, daysAhead);
}

function normalizeTime(raw: string): string {
  const value = raw.trim().toLowerCase();

  const twentyFourHour = /^(\d{1,2}):([0-5]\d)$/.exec(value);

  if (twentyFourHour) {
    const hour = twentyFourHour[1] ?? '0';
    const minutes = twentyFourHour[2] ?? '00';

    return `${hour.padStart(2, '0')}:${minutes}`;
  }

  const twelveHour = /^(1[0-2]|0?[1-9])(?::([0-5]\d))?\s*(am|pm)$/.exec(value);

  if (!twelveHour) {
    return value;
  }

  let hour = Number(twelveHour[1]);
  const minutes = twelveHour[2] ?? '00';
  const meridian = twelveHour[3];

  if (meridian === 'pm' && hour < 12) {
    hour += 12;
  }

  if (meridian === 'am' && hour === 12) {
    hour = 0;
  }

  return `${String(hour).padStart(2, '0')}:${minutes}`;
}

function parseDuration(raw: string): number | undefined {
  const match = /^(?:(\d{1,2})h(?:(\d{1,2})m)?|(\d{1,3})m)$/i.exec(raw);

  if (!match) {
    return undefined;
  }

  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? match[3] ?? 0);

  if (match[1] && minutes > 59) {
    return undefined;
  }

  const total = hours * 60 + minutes;

  return total > 0 ? total : undefined;
}

function parsePriority(raw: string): Priority {
  switch (raw) {
    case '!!!':
      return 'high';

    case '!!':
      return 'medium';

    default:
      return 'low';
  }
}

function parseItemType(raw: string): ItemType | undefined {
  switch (raw.slice(1).toLowerCase()) {
    case 'task':
      return 'task';

    case 'event':
      return 'event';

    default:
      return undefined;
  }
}

function tokensFromPattern(text: string, pattern: RegExp, kind: SmartTokenKind): SmartToken[] {
  return [...text.matchAll(pattern)].map((match) => {
    const whitespace = match[1]?.length ?? 0;

    const start = (match.index ?? 0) + whitespace;

    const raw = match[0].slice(whitespace);

    return {
      kind,
      raw,
      start,
      end: start + raw.length,
    };
  });
}

function maskTokenRanges(text: string, tokens: readonly SmartToken[]): string {
  const characters = text.split('');

  for (const token of tokens) {
    for (let index = token.start; index < token.end; index += 1) {
      characters[index] = ' ';
    }
  }

  return characters.join('');
}

function isKnownSpace(token: SmartToken, knownSpaces?: ReadonlySet<string>): boolean {
  if (token.kind !== 'space' || knownSpaces === undefined) {
    return true;
  }

  return knownSpaces.has(token.raw.slice(1).toLocaleLowerCase());
}

function titleWithoutTokens(input: string, tokens: readonly SmartToken[]): string {
  return maskTokenRanges(input, tokens).replace(/\s+/g, ' ').trim();
}

function parseDate(raw: string, referenceDate: string): string {
  const value = raw.toLowerCase();

  if (value === 'today') {
    return referenceDate;
  }

  if (value === 'tomorrow') {
    return addDays(referenceDate, 1);
  }

  return nextWeekday(referenceDate, value);
}

export function lexSmartInput(input: string): SmartToken[] {
  const explicitTokens = [
    ...tokensFromPattern(input, COMMAND_PATTERN, 'type'),
    ...tokensFromPattern(input, SPACE_PATTERN, 'space'),
    ...tokensFromPattern(input, PRIORITY_PATTERN, 'priority'),
  ];

  let masked = maskTokenRanges(input, explicitTokens);

  const dateTokens = tokensFromPattern(masked, DAY_PATTERN, 'date');

  masked = maskTokenRanges(masked, dateTokens);

  const durationTokens = tokensFromPattern(masked, DURATION_PATTERN, 'time').filter(
    (token) => parseDuration(token.raw) !== undefined,
  );

  masked = maskTokenRanges(masked, durationTokens);

  const timeTokens = tokensFromPattern(masked, TIME_PATTERN, 'time');

  return [...explicitTokens, ...dateTokens, ...durationTokens, ...timeTokens].sort(
    (left, right) => left.start - right.start,
  );
}

export function tokenizeSmartInput(input: string): SmartTokenSegment[] {
  const segments: SmartTokenSegment[] = [];
  let cursor = 0;

  for (const token of lexSmartInput(input)) {
    if (token.start > cursor) {
      segments.push({
        text: input.slice(cursor, token.start),
      });
    }

    segments.push({
      text: input.slice(token.start, token.end),
      kind: token.kind,
    });

    cursor = token.end;
  }

  if (cursor < input.length) {
    segments.push({
      text: input.slice(cursor),
    });
  }

  return segments;
}

export function parseSmartInput(
  input: string,
  referenceDate = toLocalDateString(),
  knownSpaceNames?: readonly string[],
): SmartParseResult {
  const knownSpaces = knownSpaceNames
    ? new Set(knownSpaceNames.map((name) => name.toLocaleLowerCase()))
    : undefined;

  const tokens = lexSmartInput(input).filter((token) => isKnownSpace(token, knownSpaces));

  const result: SmartParseResult = {
    title: titleWithoutTokens(input, tokens),
  };

  const typeToken = tokens.find((token) => token.kind === 'type');

  if (typeToken) {
    const type = parseItemType(typeToken.raw);

    if (type) {
      result.type = type;
    }
  }

  const priorityTokens = tokens.filter((token) => token.kind === 'priority');

  if (priorityTokens.length > 0) {
    const strongest = priorityTokens.reduce((current, token) =>
      token.raw.length > current.raw.length ? token : current,
    );

    result.priority = parsePriority(strongest.raw);
  }

  const spaceToken = tokens.find((token) => token.kind === 'space');

  if (spaceToken) {
    result.spaceName = spaceToken.raw.slice(1);
  }

  const dateToken = tokens.find((token) => token.kind === 'date');

  if (dateToken) {
    result.date = parseDate(dateToken.raw, referenceDate);
  }

  let durationMinutes: number | undefined;

  for (const token of tokens) {
    if (token.kind !== 'time') {
      continue;
    }

    const duration = parseDuration(token.raw);

    if (duration !== undefined) {
      durationMinutes ??= duration;
      continue;
    }

    result.time ??= normalizeTime(token.raw);
  }

  if (durationMinutes !== undefined) {
    result.durationMinutes = durationMinutes;
  }

  return result;
}
