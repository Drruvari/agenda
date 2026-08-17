import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Repositories } from '@/data/repositories';
import type { EventItem, TaskItem } from '@/data/schema/types';

import {
  completeAgendaTask,
  createAgendaEvent,
  createAgendaTask,
  uncompleteAgendaTask,
  updateAgendaItem,
} from './agendaLifecycle';

const native = vi.hoisted(() => ({
  cancelReminder: vi.fn(),
  createDeviceEvent: vi.fn(),
  deleteDeviceEvent: vi.fn(),
  scheduleReminder: vi.fn(),
}));

vi.mock('@/native/notifications/reminders', () => ({
  cancelReminder: native.cancelReminder,
  scheduleReminder: native.scheduleReminder,
}));

vi.mock('@/native/calendar/deviceCalendar', () => ({
  createDeviceEvent: native.createDeviceEvent,
  deleteDeviceEvent: native.deleteDeviceEvent,
}));

const task: TaskItem = {
  id: 'task-1',
  type: 'task',
  title: 'Task',
  priority: 'none',
  date: '2099-08-17',
  time: '16:00',
  reminderAt: '2020-01-01T14:00:00.000Z',
  notificationId: 'old-reminder',
  completed: false,
  createdAt: '2026-08-17T10:00:00.000Z',
  updatedAt: '2026-08-17T10:00:00.000Z',
};

const event: EventItem = {
  id: 'event-1',
  type: 'event',
  title: 'Event',
  priority: 'none',
  date: '2099-08-17',
  time: '16:00',
  durationMinutes: 30,
  createdAt: '2026-08-17T10:00:00.000Z',
  updatedAt: '2026-08-17T10:00:00.000Z',
};

function repositories(agenda: Record<string, unknown>): Repositories {
  return { agenda } as unknown as Repositories;
}

beforeEach(() => {
  vi.clearAllMocks();
  native.cancelReminder.mockResolvedValue(undefined);
  native.createDeviceEvent.mockResolvedValue(null);
  native.deleteDeviceEvent.mockResolvedValue(undefined);
  native.scheduleReminder.mockResolvedValue('new-reminder');
});

describe('agenda lifecycle resource ownership', () => {
  it('keeps the old reminder until an update persists', async () => {
    const update = vi.fn().mockRejectedValue(new Error('write failed'));

    await expect(
      updateAgendaItem(repositories({ update }), task, { ...task, title: 'Changed' }),
    ).rejects.toThrow('write failed');

    expect(native.cancelReminder).toHaveBeenCalledTimes(1);
    expect(native.cancelReminder).toHaveBeenCalledWith('new-reminder');
    expect(native.cancelReminder).not.toHaveBeenCalledWith('old-reminder');
  });

  it('schedules from date and time, then cancels the old reminder after persistence', async () => {
    const order: string[] = [];
    const update = vi.fn(async (item: TaskItem) => {
      order.push('persist');
      return item;
    });
    native.cancelReminder.mockImplementation(async () => {
      order.push('cancel-old');
    });

    await updateAgendaItem(repositories({ update }), task, { ...task, title: 'Changed' });

    const scheduledAt = native.scheduleReminder.mock.calls[0][2] as Date;
    expect(scheduledAt.getFullYear()).toBe(2099);
    expect(scheduledAt.getHours()).toBe(16);
    expect(order).toEqual(['persist', 'cancel-old']);
  });

  it('cancels a newly scheduled reminder when uncomplete persistence fails', async () => {
    const restored = { ...task, completed: false };
    const repos = repositories({
      uncomplete: vi.fn().mockResolvedValue(restored),
      update: vi.fn().mockRejectedValue(new Error('write failed')),
    });

    await expect(uncompleteAgendaTask(repos, task)).rejects.toThrow('write failed');
    expect(native.cancelReminder).toHaveBeenCalledWith('new-reminder');
  });

  it('does not clean up caller-owned resources after create failures', async () => {
    const createTask = vi.fn().mockRejectedValue(new Error('task failed'));
    await expect(
      createAgendaTask(repositories({ createTask }), {
        title: 'Task',
        priority: 'none',
        date: '2099-08-17',
        notificationId: 'caller-reminder',
      }),
    ).rejects.toThrow('task failed');

    const createEvent = vi.fn().mockRejectedValue(new Error('event failed'));
    await expect(
      createAgendaEvent(repositories({ createEvent }), {
        title: 'Event',
        priority: 'none',
        date: '2099-08-17',
        durationMinutes: 30,
        deviceEventId: 'caller-event',
      }),
    ).rejects.toThrow('event failed');

    expect(native.cancelReminder).not.toHaveBeenCalledWith('caller-reminder');
    expect(native.deleteDeviceEvent).not.toHaveBeenCalledWith('caller-event');
  });

  it('retains the notification id when completion cancellation fails', async () => {
    const completed = { ...task, completed: true };
    const update = vi.fn();
    native.cancelReminder.mockRejectedValue(new Error('native failure'));

    const result = await completeAgendaTask(
      repositories({ complete: vi.fn().mockResolvedValue(completed), update }),
      task,
    );

    expect(result?.notificationId).toBe('old-reminder');
    expect(update).not.toHaveBeenCalled();
  });

  it('cleans up only resources created by a failed event create', async () => {
    native.createDeviceEvent.mockResolvedValue('new-event');
    const createEvent = vi.fn().mockRejectedValue(new Error('write failed'));

    await expect(
      createAgendaEvent(repositories({ createEvent }), {
        ...event,
        remind: true,
        device: {
          title: event.title,
          startDate: new Date(2099, 7, 17, 16),
          endDate: new Date(2099, 7, 17, 16, 30),
          allDay: false,
        },
      }),
    ).rejects.toThrow('write failed');

    expect(native.cancelReminder).toHaveBeenCalledWith('new-reminder');
    expect(native.deleteDeviceEvent).toHaveBeenCalledWith('new-event');
  });

  it('cleans up a created device event when reminder scheduling fails', async () => {
    native.createDeviceEvent.mockResolvedValue('new-event');
    native.scheduleReminder.mockRejectedValue(new Error('schedule failed'));
    const createEvent = vi.fn();

    await expect(
      createAgendaEvent(repositories({ createEvent }), {
        ...event,
        remind: true,
        device: {
          title: event.title,
          startDate: new Date(2099, 7, 17, 16),
          endDate: new Date(2099, 7, 17, 16, 30),
          allDay: false,
        },
      }),
    ).rejects.toThrow('schedule failed');

    expect(createEvent).not.toHaveBeenCalled();
    expect(native.deleteDeviceEvent).toHaveBeenCalledWith('new-event');
  });
});
