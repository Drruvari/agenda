import { useCallback, useMemo } from 'react';

import {
  type AgendaItem,
  isInboxSpaceFilter,
  isSpaceUuidFilter,
  priorityLabel,
  type TodayViewModel,
} from '@/data';
import { isTimePast } from '@/domain/day/isTimePast';
import type { DeviceCalendarEvent } from '@/native/calendar/deviceCalendar';
import { mergeNativeBirthdays } from '@/native/calendar/mergeNativeBirthdays';
import type { DeviceBirthday } from '@/native/contacts/deviceBirthdays';
import type { DeviceSystemReminder } from '@/native/reminders/systemReminders';

export type TodayMode = 'Recent' | 'Today' | 'Upcoming';
export type AgendaPriority = '' | '!' | '!!' | '!!!';

export type TodayAgendaTask = {
  id: string;
  title: string;
  subtitle: string;
  priority?: AgendaPriority;
  late?: boolean;
  completed?: boolean;
  period?: TodayMode;
  special?: 'calendar' | 'note' | 'birthday';
  item?: AgendaItem;
  systemReminderId?: string;
  deviceEventId?: string;
};

export type TodayScheduledTask = TodayAgendaTask & {
  time: string;
  icon?: 'clock';
};

export type TodayRoutine = {
  id: string;
  title: string;
  subtitle: string;
  completed: boolean;
};

type Options = {
  activeSpaceId: string | null;
  deviceBirthdays: DeviceBirthday[];
  deviceEvents: DeviceCalendarEvent[];
  mode: TodayMode;
  systemReminders: DeviceSystemReminder[];
  view: TodayViewModel | null;
};

export function useTodayAgenda({
  activeSpaceId,
  deviceBirthdays,
  deviceEvents,
  mode,
  systemReminders,
  view,
}: Options) {
  const spacesById = useMemo(
    () => new Map(view?.spaces.map((space) => [space.id, space.name]) ?? []),
    [view?.spaces],
  );
  const showExternalItems = !activeSpaceId;

  const activeSpaceLabel = useMemo(() => {
    if (isInboxSpaceFilter(activeSpaceId)) return 'Inbox';
    if (isSpaceUuidFilter(activeSpaceId)) return spacesById.get(activeSpaceId!) ?? 'this Space';
    return null;
  }, [activeSpaceId, spacesById]);

  const mapItem = useCallback(
    (item: AgendaItem): TodayAgendaTask => {
      const spaceName = item.spaceId ? spacesById.get(item.spaceId) : undefined;
      const typeLabel =
        item.type === 'event'
          ? `${item.durationMinutes} min`
          : item.type === 'note'
            ? 'Note'
            : 'Task';
      return {
        id: item.id,
        title: item.title,
        subtitle: [spaceName, typeLabel].filter(Boolean).join(', '),
        priority: priorityLabel(item.priority) as AgendaPriority,
        completed: item.type === 'task' ? item.completed : false,
        period: mode,
        special: item.type === 'event' ? 'calendar' : item.type === 'note' ? 'note' : undefined,
        item,
      };
    },
    [mode, spacesById],
  );

  const birthdays = useMemo(
    () => mergeNativeBirthdays(deviceEvents, deviceBirthdays),
    [deviceBirthdays, deviceEvents],
  );

  const allDay = useMemo<TodayAgendaTask[]>(
    () => [
      ...(view?.allDay.map(mapItem) ?? []),
      ...(showExternalItems
        ? [
            ...deviceEvents
              .filter(
                (event) =>
                  event.kind === 'event' &&
                  event.allDay &&
                  !view?.allDay.some((item) => item.deviceEventId === event.id),
              )
              .map((event) => ({
                id: `device:${event.id}`,
                title: event.title,
                subtitle: event.calendarTitle ?? 'Device calendar',
                period: mode,
                special: 'calendar' as const,
              })),
            ...birthdays.map((birthday) => ({
              id: birthday.id,
              title: birthday.title,
              subtitle: birthday.subtitle,
              period: mode,
              special: 'birthday' as const,
            })),
            ...systemReminders
              .filter((reminder) => reminder.allDay)
              .map((reminder) => ({
                id: `system-reminder:${reminder.id}`,
                title: reminder.title,
                subtitle: reminder.listTitle ?? 'Apple Reminders',
                period: mode,
                systemReminderId: reminder.id,
              })),
          ]
        : []),
    ],
    [birthdays, deviceEvents, mapItem, mode, showExternalItems, systemReminders, view?.allDay],
  );

  const scheduled = useMemo<TodayScheduledTask[]>(
    () =>
      [
        ...(view?.scheduled.map((item) => {
          const completed = item.type === 'task' && item.completed;
          const time = item.time ?? '';
          return {
            ...mapItem(item),
            time,
            icon: item.type === 'event' ? ('clock' as const) : undefined,
            late: Boolean(time) && !completed && isTimePast(time),
            completed,
          };
        }) ?? []),
        ...(showExternalItems
          ? [
              ...deviceEvents
                .filter((event) => {
                  if (event.kind !== 'event' || event.allDay) return false;
                  return !view?.scheduled.some((item) => {
                    if (item.deviceEventId && item.deviceEventId === event.id) return true;
                    if (item.type !== 'event' || !item.time) return false;
                    const start = new Date(event.startDate);
                    const hh = String(start.getHours()).padStart(2, '0');
                    const mm = String(start.getMinutes()).padStart(2, '0');
                    return item.title === event.title && item.time === `${hh}:${mm}`;
                  });
                })
                .map((event) => {
                  const time = new Date(event.startDate).toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  });
                  return {
                    id: `device:${event.id}`,
                    title: event.title,
                    subtitle: event.calendarTitle ?? 'Device calendar',
                    period: mode,
                    time,
                    icon: 'clock' as const,
                    special: 'calendar' as const,
                    deviceEventId: event.id,
                    late: isTimePast(time),
                  };
                }),
              ...systemReminders
                .filter((reminder) => !reminder.allDay && reminder.dueDate)
                .map((reminder) => {
                  const time = new Date(reminder.dueDate as string).toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  });
                  return {
                    id: `system-reminder:${reminder.id}`,
                    title: reminder.title,
                    subtitle: reminder.listTitle ?? 'Apple Reminders',
                    period: mode,
                    time,
                    icon: 'clock' as const,
                    systemReminderId: reminder.id,
                    late: isTimePast(time),
                  };
                }),
            ]
          : []),
      ].sort((a, b) => {
        if (Boolean(a.late) !== Boolean(b.late)) return a.late ? -1 : 1;
        return a.time.localeCompare(b.time);
      }),
    [deviceEvents, mapItem, mode, showExternalItems, systemReminders, view?.scheduled],
  );

  const completed = useMemo(() => view?.completed.map(mapItem) ?? [], [mapItem, view?.completed]);
  const routines = useMemo<TodayRoutine[]>(
    () =>
      view?.routines.map(({ routine, completed: done, spaceName }) => ({
        id: routine.id,
        title: routine.name,
        subtitle: spaceName ?? 'Routine',
        completed: done,
      })) ?? [],
    [view?.routines],
  );

  return {
    activeSpaceLabel,
    allDay,
    completed,
    routines,
    scheduled,
  };
}
