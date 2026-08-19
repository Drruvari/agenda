import { loadTodayView } from '@/data/queries/today';
import type { Repositories } from '@/data/repositories/repositories';
import { localDateTime, parseLocalDate, toLocalDateString } from '@/data/schema/ids';
import { isTimePast } from '@/domain/day/isTimePast';
import { getCalendarAccessState, listDeviceEvents } from '@/native/calendar/deviceCalendar';
import { mergeNativeBirthdays } from '@/native/calendar/mergeNativeBirthdays';
import { getBirthdayAccessState, listDeviceBirthdays } from '@/native/contacts/deviceBirthdays';
import {
  getSystemReminderAccessState,
  listSystemReminders,
} from '@/native/reminders/systemReminders';

import type { WidgetRow, WidgetSnapshot, WidgetSourceStatus } from './types';

type SourceResult<T> = { status: WidgetSourceStatus; value: T };
type SortableWidgetRow = WidgetRow & { sortAt?: number };

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

  const agendaRows: SortableWidgetRow[] = [...agenda.allDay, ...agenda.scheduled].map((item) => {
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
      sortAt: item.time ? (localDateTime(date, item.time)?.getTime() ?? undefined) : undefined,
    };
  });
  const mergedBirthdays = mergeNativeBirthdays(calendar.value, birthdays.value);
  const externalRows: SortableWidgetRow[] = [
    ...calendar.value
      .filter((event) => event.kind === 'event')
      .map((event) => {
        const startAt = new Date(event.startDate);
        const time = event.allDay
          ? undefined
          : startAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return {
          id: `calendar:${event.id}`,
          title: event.title,
          section: event.allDay ? ('allDay' as const) : ('scheduled' as const),
          time,
          completed: false,
          checkable: false,
          late: Boolean(time) && startAt.getTime() < now.getTime(),
          source: 'calendar' as const,
          sortAt: event.allDay ? undefined : startAt.getTime(),
        };
      }),
    ...mergedBirthdays.map((birthday) => ({
      id: birthday.id,
      title: birthday.title,
      section: 'allDay' as const,
      completed: false,
      checkable: false,
      source: 'birthday' as const,
    })),
    ...reminders.value.map((reminder) => {
      const due = reminder.dueDate ? new Date(reminder.dueDate) : null;
      const time =
        reminder.allDay || !due
          ? undefined
          : due.toLocaleTimeString([], {
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
        late: Boolean(due && due.getTime() < now.getTime()),
        source: 'reminder' as const,
        sortAt: reminder.allDay || !due ? undefined : due.getTime(),
      };
    }),
  ];
  const rows = [...agendaRows, ...externalRows]
    .sort((left, right) => {
      if (left.section !== right.section) return left.section === 'allDay' ? -1 : 1;
      if (
        left.section === 'scheduled' &&
        !left.completed &&
        !right.completed &&
        left.late !== right.late
      ) {
        return left.late ? -1 : 1;
      }
      if (left.completed !== right.completed) return left.completed ? 1 : -1;
      return (left.sortAt ?? 0) - (right.sortAt ?? 0) || left.title.localeCompare(right.title);
    })
    .map(({ sortAt: _sortAt, ...row }) => row);

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
