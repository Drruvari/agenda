import { loadTodayView } from '@/data/queries/today';
import type { Repositories } from '@/data/repositories';
import { parseLocalDate, toLocalDateString } from '@/data/schema/ids';
import { isTimePast } from '@/domain/day/isTimePast';
import { getCalendarAccessState, listDeviceEvents } from '@/native/calendar/deviceCalendar';
import { getBirthdayAccessState, listDeviceBirthdays } from '@/native/contacts/deviceBirthdays';
import {
  getSystemReminderAccessState,
  listSystemReminders,
} from '@/native/reminders/systemReminders';

import type { WidgetRow, WidgetSnapshot, WidgetSourceStatus } from './types';

type SourceResult<T> = { status: WidgetSourceStatus; value: T };

function errorResult<T>(value: T, source: string, error: unknown): SourceResult<T> {
  console.warn(`[widget-sync] ${source}`, error);
  return { status: 'error', value };
}

async function readSource<T>(
  access: () => Promise<string>,
  read: () => Promise<T>,
  empty: T,
  source: string,
): Promise<SourceResult<T>> {
  try {
    const state = await access();
    if (state !== 'granted') {
      return { status: state === 'denied' ? 'denied' : 'unavailable', value: empty };
    }
    try {
      return { status: 'ok', value: await read() };
    } catch (error) {
      return errorResult(empty, source, error);
    }
  } catch (error) {
    return errorResult(empty, `${source}:access`, error);
  }
}

export async function buildWidgetSnapshot(
  repos: Repositories,
  generation: number,
): Promise<WidgetSnapshot> {
  const date = toLocalDateString();
  const start = parseLocalDate(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const now = new Date();

  const [agenda, calendar, birthdays, reminders] = await Promise.all([
    loadTodayView(repos, date, null, { includeCompleted: true, separateCompleted: false }),
    readSource(getCalendarAccessState, () => listDeviceEvents(start, end), [], 'calendar'),
    readSource(getBirthdayAccessState, () => listDeviceBirthdays(start), [], 'birthdays'),
    readSource(
      getSystemReminderAccessState,
      () => listSystemReminders(start, end),
      [],
      'reminders',
    ),
  ]);

  const agendaRows: WidgetRow[] = [...agenda.allDay, ...agenda.scheduled].map((item) => {
    const checkable = item.type === 'task';
    const completed = checkable && item.completed;
    const section = item.time ? ('scheduled' as const) : ('allDay' as const);
    return {
      id: item.id,
      title: item.title,
      section,
      time: item.time,
      completed,
      checkable,
      late: Boolean(item.time) && !completed && isTimePast(item.time!, now),
      source: 'agenda' as const,
    };
  });
  const externalRows: WidgetRow[] = [
    ...calendar.value.map((event) => {
      const time = event.allDay
        ? undefined
        : new Date(event.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return {
        id: `calendar:${event.id}`,
        title: event.title,
        section: event.allDay ? ('allDay' as const) : ('scheduled' as const),
        time,
        completed: false,
        checkable: false,
        late: Boolean(time) && isTimePast(time!, now),
        source: event.kind === 'birthday' ? ('birthday' as const) : ('calendar' as const),
      };
    }),
    ...birthdays.value.map((birthday) => ({
      id: `birthday:${birthday.id}`,
      title: birthday.name,
      section: 'allDay' as const,
      completed: false,
      checkable: false,
      source: 'birthday' as const,
    })),
    ...reminders.value.map((reminder) => {
      const time =
        reminder.allDay || !reminder.dueDate
          ? undefined
          : new Date(reminder.dueDate).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });
      return {
        id: `reminder:${reminder.id}`,
        title: reminder.title,
        section:
          reminder.allDay || !reminder.dueDate ? ('allDay' as const) : ('scheduled' as const),
        time,
        completed: false,
        checkable: false,
        late: Boolean(time) && isTimePast(time!, now),
        source: 'reminder' as const,
      };
    }),
  ];
  const rows = [...agendaRows, ...externalRows].sort((left, right) => {
    if (left.section !== right.section) return left.section === 'allDay' ? -1 : 1;
    if (left.section === 'scheduled' && !left.completed && !right.completed && left.late !== right.late) {
      return left.late ? -1 : 1;
    }
    if (left.completed !== right.completed) return left.completed ? 1 : -1;
    return (
      (left.time ?? '').localeCompare(right.time ?? '') || left.title.localeCompare(right.title)
    );
  });

  return {
    schemaVersion: 1,
    generation,
    date,
    generatedAt: new Date().toISOString(),
    remainingCount: rows.filter((row) => !row.completed).length,
    rows,
    sources: {
      agenda: 'ok',
      calendar: calendar.status,
      birthdays: birthdays.status,
      reminders: reminders.status,
    },
  };
}
