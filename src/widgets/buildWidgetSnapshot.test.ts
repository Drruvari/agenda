import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildWidgetSnapshot } from './buildWidgetSnapshot';

const sources = vi.hoisted(() => ({
  loadTodayView: vi.fn(),
  listDeviceBirthdays: vi.fn(),
  listDeviceEvents: vi.fn(),
  listSystemReminders: vi.fn(),
}));

vi.mock('@/data/queries/today', () => ({ loadTodayView: sources.loadTodayView }));
vi.mock('@/native/calendar/deviceCalendar', () => ({
  getCalendarAccessState: vi.fn().mockResolvedValue('granted'),
  listDeviceEvents: sources.listDeviceEvents,
}));
vi.mock('@/native/contacts/deviceBirthdays', () => ({
  getBirthdayAccessState: vi.fn().mockResolvedValue('granted'),
  listDeviceBirthdays: sources.listDeviceBirthdays,
}));
vi.mock('@/native/reminders/systemReminders', () => ({
  getSystemReminderAccessState: vi.fn().mockResolvedValue('granted'),
  listSystemReminders: sources.listSystemReminders,
}));

describe('buildWidgetSnapshot', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 17, 12));
    sources.loadTodayView.mockResolvedValue({
      spaces: [],
      allDay: [],
      scheduled: [
        {
          id: 'agenda-10',
          type: 'task',
          title: 'Agenda 10',
          priority: 'none',
          date: '2026-08-17',
          time: '10:00',
          completed: false,
          createdAt: '',
          updatedAt: '',
        },
      ],
      completed: [],
      routines: [],
      dailyNote: null,
    });
    sources.listDeviceEvents.mockResolvedValue([
      {
        id: 'birthday-calendar',
        title: 'Alex’s Birthday',
        startDate: '2026-08-17T00:00:00',
        endDate: '2026-08-18T00:00:00',
        allDay: true,
        kind: 'birthday',
      },
      {
        id: 'calendar-14',
        title: 'Calendar 14',
        startDate: '2026-08-17T14:00:00',
        endDate: '2026-08-17T15:00:00',
        allDay: false,
        kind: 'event',
      },
      {
        id: 'calendar-09',
        title: 'Calendar 09',
        startDate: '2026-08-17T09:00:00',
        endDate: '2026-08-17T10:00:00',
        allDay: false,
        kind: 'event',
      },
    ]);
    sources.listDeviceBirthdays.mockResolvedValue([
      { id: 'birthday-contact', name: 'Alex', month: 7, day: 17 },
    ]);
    sources.listSystemReminders.mockResolvedValue([
      {
        id: 'overdue-reminder',
        title: 'Overdue reminder',
        dueDate: '2026-08-16T23:00:00',
        allDay: false,
      },
    ]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('deduplicates birthdays and sorts scheduled rows by real timestamps', async () => {
    const snapshot = await buildWidgetSnapshot({} as never, 1);

    expect(snapshot.rows.filter((row) => row.source === 'birthday')).toHaveLength(1);
    expect(
      snapshot.rows.filter((row) => row.section === 'scheduled').map((row) => row.title),
    ).toEqual(['Overdue reminder', 'Calendar 09', 'Agenda 10', 'Calendar 14']);
    expect(snapshot.rows.find((row) => row.title === 'Overdue reminder')?.late).toBe(true);
  });
});
