import { useCallback, useEffect, useRef, useState } from 'react';

import { useData } from '@/data/provider/DataContext';
import { loadTodayView } from '@/data/queries/today';
import { parseLocalDate } from '@/data/schema/ids';
import type { TodayViewModel } from '@/data/schema/types';
import {
  getCalendarAccessState,
  listDeviceEvents,
  requestCalendarAccess,
} from '@/native/calendar/deviceCalendar';
import type {
  CalendarAccessState,
  DeviceCalendarEvent,
} from '@/native/calendar/deviceCalendar.types';
import { getBirthdayAccessState, listDeviceBirthdays } from '@/native/contacts/deviceBirthdays';
import type { DeviceBirthday } from '@/native/contacts/deviceBirthdays.types';
import {
  getSystemReminderAccessState,
  listSystemReminders,
  requestSystemReminderAccess,
  systemRemindersSupported,
} from '@/native/reminders/systemReminders';
import type {
  DeviceSystemReminder,
  SystemReminderAccessState,
} from '@/native/reminders/systemReminders.types';

type ReloadOptions = {
  activeSpaceId?: string | null;
  includeNative?: boolean;
  selectedDate?: string;
};

export function useTodayView() {
  const { repos, refresh, revision, settings, settingsStore, ui } = useData();
  const [view, setView] = useState<TodayViewModel | null>(null);
  const [deviceEvents, setDeviceEvents] = useState<DeviceCalendarEvent[]>([]);
  const [deviceBirthdays, setDeviceBirthdays] = useState<DeviceBirthday[]>([]);
  const [systemReminders, setSystemReminders] = useState<DeviceSystemReminder[]>([]);
  const [calendarAccess, setCalendarAccess] = useState<CalendarAccessState>('undetermined');
  const [reminderAccess, setReminderAccess] = useState<SystemReminderAccessState>('undetermined');
  const [calendarPromptDismissed, setCalendarPromptDismissed] = useState(false);
  const [reminderPromptDismissed, setReminderPromptDismissed] = useState(false);
  const reloadRequestId = useRef(0);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      settingsStore.getItem('integrations.calendar.promptDismissed'),
      settingsStore.getItem('integrations.reminders.promptDismissed'),
    ]).then(([calendarDismissed, remindersDismissed]) => {
      if (cancelled) return;
      setCalendarPromptDismissed(calendarDismissed === 'true');
      setReminderPromptDismissed(remindersDismissed === 'true');
    });
    return () => {
      cancelled = true;
    };
  }, [settingsStore]);

  const reload = useCallback(
    async (options: ReloadOptions = {}) => {
      const requestId = ++reloadRequestId.current;
      const selectedDate = options.selectedDate ?? ui.selectedDate;
      const activeSpaceId =
        options.activeSpaceId === undefined ? ui.activeSpaceId : options.activeSpaceId;

      const next = await loadTodayView(repos, selectedDate, activeSpaceId, {
        includeCompleted: true,
        separateCompleted: settings.general.showCompleted,
      });
      if (requestId !== reloadRequestId.current) return false;
      setView(next);

      if (options.includeNative === false) {
        setDeviceEvents([]);
        setDeviceBirthdays([]);
        setSystemReminders([]);
        return true;
      }

      const start = parseLocalDate(selectedDate);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      const [calendarState, birthdayState, reminderState] = await Promise.all([
        getCalendarAccessState(),
        getBirthdayAccessState(),
        systemRemindersSupported
          ? getSystemReminderAccessState()
          : Promise.resolve('unavailable' as SystemReminderAccessState),
      ]);
      const [nativeEvents, birthdays, reminders] = await Promise.all([
        calendarState === 'granted'
          ? listDeviceEvents(start, end).catch(() => [])
          : Promise.resolve([]),
        birthdayState === 'granted'
          ? listDeviceBirthdays(start).catch(() => [])
          : Promise.resolve([]),
        reminderState === 'granted'
          ? listSystemReminders(start, end).catch(() => [])
          : Promise.resolve([]),
      ]);

      if (requestId !== reloadRequestId.current) return false;
      setCalendarAccess(calendarState);
      setReminderAccess(reminderState);
      setDeviceEvents(nativeEvents);
      setDeviceBirthdays(birthdays);
      setSystemReminders(reminders);
      return true;
    },
    [repos, settings.general.showCompleted, ui.activeSpaceId, ui.selectedDate],
  );

  useEffect(() => {
    const timer = setTimeout(() => void reload(), 0);
    return () => clearTimeout(timer);
  }, [reload, revision]);

  const requestCalendarPermission = useCallback(async () => {
    setCalendarAccess(await requestCalendarAccess());
    refresh();
  }, [refresh]);

  const requestReminderPermission = useCallback(async () => {
    setReminderAccess(await requestSystemReminderAccess());
    refresh();
  }, [refresh]);

  const dismissCalendarPermission = useCallback(() => {
    setCalendarPromptDismissed(true);
    void settingsStore.setItem('integrations.calendar.promptDismissed', 'true');
  }, [settingsStore]);

  const dismissReminderPermission = useCallback(() => {
    setReminderPromptDismissed(true);
    void settingsStore.setItem('integrations.reminders.promptDismissed', 'true');
  }, [settingsStore]);

  return {
    calendarAccess,
    calendarPromptDismissed,
    deviceBirthdays,
    deviceEvents,
    dismissCalendarPermission,
    dismissReminderPermission,
    reload,
    reminderAccess,
    reminderPromptDismissed,
    requestCalendarPermission,
    requestReminderPermission,
    systemReminders,
    view,
  };
}
