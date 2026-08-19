import type { Repositories } from '@/data/repositories/repositories';
import type { CreateEventInput, CreateTaskInput } from '@/data/repositories/agenda.repository';
import { localDateTime } from '@/data/schema/ids';
import type { AgendaItem, EventItem, TaskItem } from '@/data/schema/types';
import { createDeviceEvent, deleteDeviceEvent } from '@/native/calendar/deviceCalendar';
import type { CreateDeviceEventInput } from '@/native/calendar/deviceCalendar.types';
import { cancelReminder, scheduleReminder } from '@/native/notifications/reminders';

type ScheduledReminder = {
  notificationId?: string;
  reminderAt?: string;
};

type CreateAgendaEventInput = CreateEventInput & {
  device?: CreateDeviceEventInput;
  remind?: boolean;
};

type CreateAgendaTaskInput = CreateTaskInput & {
  remind?: boolean;
};

function getReminderDate(item: Pick<AgendaItem, 'date' | 'time'>): Date | null {
  if (!item.time) {
    return null;
  }

  return localDateTime(item.date, item.time);
}

async function scheduleItemReminder(
  item: Pick<AgendaItem, 'title' | 'details' | 'date' | 'time'>,
): Promise<ScheduledReminder> {
  const when = getReminderDate(item);

  if (!when || when.getTime() <= Date.now()) {
    return {};
  }

  const notificationId = await scheduleReminder(item.title, item.details, when);

  if (!notificationId) {
    return {};
  }

  return {
    notificationId,
    reminderAt: when.toISOString(),
  };
}

async function cancelReminderSafely(notificationId?: string): Promise<void> {
  if (!notificationId) {
    return;
  }

  await cancelReminder(notificationId).catch(() => undefined);
}

async function deleteDeviceEventSafely(deviceEventId?: string): Promise<void> {
  if (!deviceEventId) {
    return;
  }

  await deleteDeviceEvent(deviceEventId).catch(() => undefined);
}

function cleanAgendaItem(item: AgendaItem): AgendaItem {
  return {
    ...item,
    title: item.title.trim(),
    details: item.details?.trim() || undefined,
    time: item.time?.trim() || undefined,
  };
}

function shouldScheduleReminder(item: AgendaItem): boolean {
  return Boolean(item.time && item.reminderAt && (item.type === 'task' || item.type === 'event'));
}

export async function completeAgendaTask(
  repos: Repositories,
  task: TaskItem,
): Promise<TaskItem | null> {
  const completed = await repos.agenda.complete(task.id);

  if (!completed) {
    return null;
  }

  const notificationId = completed.notificationId ?? task.notificationId;

  if (!notificationId) {
    return completed;
  }

  try {
    await cancelReminder(notificationId);
  } catch {
    return completed;
  }

  return repos.agenda.update({
    ...completed,
    notificationId: undefined,
  }) as Promise<TaskItem>;
}

export async function uncompleteAgendaTask(
  repos: Repositories,
  task: TaskItem,
): Promise<TaskItem | null> {
  const restored = await repos.agenda.uncomplete(task.id);

  if (!restored) {
    return null;
  }

  const scheduled = await scheduleItemReminder(restored);

  if (!scheduled.notificationId) {
    return restored;
  }

  try {
    return repos.agenda.update({
      ...restored,
      notificationId: scheduled.notificationId,
      reminderAt: scheduled.reminderAt ?? restored.reminderAt,
    }) as Promise<TaskItem>;
  } catch (error) {
    await cancelReminderSafely(scheduled.notificationId);

    throw error;
  }
}

export async function updateAgendaItem(
  repos: Repositories,
  previous: AgendaItem,
  next: AgendaItem,
): Promise<AgendaItem> {
  const cleaned = cleanAgendaItem(next);

  const scheduled = shouldScheduleReminder(cleaned) ? await scheduleItemReminder(cleaned) : {};

  try {
    const saved = await repos.agenda.update({
      ...cleaned,
      notificationId: scheduled.notificationId,
      reminderAt:
        scheduled.reminderAt ?? (scheduled.notificationId ? cleaned.reminderAt : undefined),
    });

    if (previous.notificationId && previous.notificationId !== scheduled.notificationId) {
      await cancelReminderSafely(previous.notificationId);
    }

    return saved;
  } catch (error) {
    await cancelReminderSafely(scheduled.notificationId);

    throw error;
  }
}

export async function deleteAgendaItem(repos: Repositories, item: AgendaItem): Promise<void> {
  await repos.agenda.delete(item.id);

  await cancelReminderSafely(item.notificationId);

  if (item.type === 'event') {
    await deleteDeviceEventSafely(item.deviceEventId);
  }
}

export async function createAgendaTask(
  repos: Repositories,
  input: CreateAgendaTaskInput,
): Promise<TaskItem> {
  let notificationId = input.notificationId;

  let reminderAt = input.reminderAt;

  let createdNotificationId: string | undefined;

  try {
    if (input.remind && input.time) {
      const scheduled = await scheduleItemReminder(input);

      createdNotificationId = scheduled.notificationId;

      notificationId = createdNotificationId;

      reminderAt = scheduled.reminderAt;
    }

    return await repos.agenda.createTask({
      ...input,
      notificationId,
      reminderAt,
    });
  } catch (error) {
    await cancelReminderSafely(createdNotificationId);

    throw error;
  }
}

export async function createAgendaEvent(
  repos: Repositories,
  input: CreateAgendaEventInput,
): Promise<EventItem> {
  let deviceEventId = input.deviceEventId;

  let notificationId = input.notificationId;

  let reminderAt = input.reminderAt;

  let createdDeviceEventId: string | undefined;

  let createdNotificationId: string | undefined;

  try {
    if (input.device && !deviceEventId) {
      createdDeviceEventId = (await createDeviceEvent(input.device).catch(() => null)) ?? undefined;

      deviceEventId = createdDeviceEventId;
    }

    if (input.remind) {
      const scheduled = await scheduleItemReminder(input);

      createdNotificationId = scheduled.notificationId;

      notificationId = createdNotificationId;

      reminderAt = scheduled.reminderAt;
    }

    return await repos.agenda.createEvent({
      ...input,
      deviceEventId,
      notificationId,
      reminderAt,
    });
  } catch (error) {
    await cancelReminderSafely(createdNotificationId);

    await deleteDeviceEventSafely(createdDeviceEventId);

    throw error;
  }
}
