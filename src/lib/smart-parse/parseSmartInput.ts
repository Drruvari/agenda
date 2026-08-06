/**
 * Smart parsing: maps free-text shorthand into structured create fields.
 * Kept as a pure module — no I/O — so add-sheet and tests can share it.
 *
 * Supported (iteration 1 baseline):
 *   /task /event /note
 *   tomorrow, today
 *   7pm, 7:30am, 19:00
 *   #SpaceName
 *   ! !! !!!
 */
import { addDays, toLocalDateString } from '@/data/schema/ids';
import type { ItemType, Priority } from '@/data/schema/types';

export type SmartParseResult = {
  title: string;
  type?: ItemType;
  date?: string;
  time?: string;
  spaceName?: string;
  priority?: Priority;
};

const TYPE_TOKEN = /^\/(task|event|note)\b/i;
const PRIORITY_TOKEN = /(?:^|\s)(!{1,3})(?=\s|$)/;
const SPACE_TOKEN = /(?:^|\s)#([A-Za-z0-9_-]+)/;
const DAY_TOKEN = /(?:^|\s)(today|tomorrow)\b/i;
const TIME_TOKEN =
  /(?:^|\s)((?:[01]?\d|2[0-3]):[0-5]\d|(?:1[0-2]|0?[1-9])(?::[0-5]\d)?\s*(?:am|pm))\b/i;

function normalizeTime(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
    const [h, m] = trimmed.split(':');
    return `${h.padStart(2, '0')}:${m}`;
  }

  const match = trimmed.match(/^(1[0-2]|0?[1-9])(?::([0-5]\d))?\s*(am|pm)$/);
  if (!match) {
    return trimmed;
  }

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

export function parseSmartInput(
  input: string,
  referenceDate = toLocalDateString(),
): SmartParseResult {
  let remaining = input.trim();
  const result: SmartParseResult = { title: remaining };

  const typeMatch = remaining.match(TYPE_TOKEN);
  if (typeMatch) {
    result.type = typeMatch[1].toLowerCase() as ItemType;
    remaining = remaining.replace(TYPE_TOKEN, ' ').trim();
  }

  const priorityMatch = remaining.match(PRIORITY_TOKEN);
  if (priorityMatch) {
    result.priority = priorityFromBang(priorityMatch[1]);
    remaining = remaining.replace(PRIORITY_TOKEN, ' ').trim();
  }

  const spaceMatch = remaining.match(SPACE_TOKEN);
  if (spaceMatch) {
    result.spaceName = spaceMatch[1];
    remaining = remaining.replace(SPACE_TOKEN, ' ').trim();
  }

  const dayMatch = remaining.match(DAY_TOKEN);
  if (dayMatch) {
    const day = dayMatch[1].toLowerCase();
    result.date = day === 'tomorrow' ? addDays(referenceDate, 1) : referenceDate;
    remaining = remaining.replace(DAY_TOKEN, ' ').trim();
  }

  const timeMatch = remaining.match(TIME_TOKEN);
  if (timeMatch) {
    result.time = normalizeTime(timeMatch[1]);
    remaining = remaining.replace(TIME_TOKEN, ' ').trim();
  }

  result.title = remaining.replace(/\s+/g, ' ').trim();
  return result;
}
