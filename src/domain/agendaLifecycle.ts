import type { Repositories } from '@/data/repositories';
import type { CreateEventInput, CreateTaskInput } from '@/data/repositories/agenda.repository';
import { localDateTime } from '@/data/schema/ids';
import type { AgendaItem, EventItem, TaskItem } from '@/data/schema/types';
import {
  createDeviceEvent,
  type CreateDeviceEventInput,
  deleteDeviceEvent,
} from '@/native/calendar/deviceCalendar';
import { cancelReminder, scheduleReminder } from '@/native/notifications/reminders';

function reminderWhen(item: Pick<AgendaItem, 'date' | 'time' | 'reminderAt'>): Date | null {
  if (item.reminderAt) {
    const parsed = new Date(item.reminderAt);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (item.time) return localDateTime(item.date, item.time);
  return null;
}

async function scheduleForItem(
  item: Pick<AgendaItem, 'title' | 'details' | 'date' | 'time' | 'reminderAt'>,
): Promise<{ notificationId?: string; reminderAt?: string }> {
  const when = reminderWhen(item);
  if (!when || when.getTime() <= Date.now()) return {};
  const notificationId = await scheduleReminder(item.title, item.details, when);
  if (!notificationId) return {};
  return { notificationId, reminderAt: when.toISOString() };
}

/** Persist completion first, then cancel the OS reminder so a failed save cannot orphan cancel. */
export async function completeAgendaTask(
  repos: Repositories,
  task: TaskItem,
): Promise<TaskItem | null> {
  const completed = await repos.agenda.complete(task.id);
  if (!completed) return null;

  if (task.notificationId) {
    await cancelReminder(task.notificationId).catch(() => undefined);
  }

  if (completed.notificationId) {
    return (await repos.agenda.update({
      ...completed,
      notificationId: undefined,
    })) as TaskItem;
  }
  return completed;
}

/** Restore the task, then recreate a future local notification when possible. */
export async function uncompleteAgendaTask(
  repos: Repositories,
  task: TaskItem,
): Promise<TaskItem | null> {
  const restored = await repos.agenda.uncomplete(task.id);
  if (!restored) return null;

  const scheduled = await scheduleForItem(restored);
  if (!scheduled.notificationId) return restored;

  return (await repos.agenda.update({
    ...restored,
    notificationId: scheduled.notificationId,
    reminderAt: scheduled.reminderAt ?? restored.reminderAt,
  })) as TaskItem;
}

export async function updateAgendaItem(
  repos: Repositories,
  previous: AgendaItem,
  next: AgendaItem,
): Promise<AgendaItem> {
  const cleaned: AgendaItem = {
    ...next,
    title: next.title.trim(),
    details: next.details?.trim() || undefined,
    time: next.time?.trim() || undefined,
  };

  if (previous.notificationId) {
    await cancelReminder(previous.notificationId).catch(() => undefined);
  }

  const shouldRemind =
    (cleaned.type === 'task' || cleaned.type === 'event') &&
    Boolean(cleaned.time && cleaned.reminderAt);

  let notificationId: string | undefined;
  let reminderAt: string | undefined;
  if (shouldRemind) {
    const scheduled = await scheduleForItem(cleaned);
    notificationId = scheduled.notificationId;
    reminderAt = scheduled.reminderAt;
  }

  try {
    return await repos.agenda.update({
      ...cleaned,
      notificationId,
      reminderAt: reminderAt ?? (notificationId ? cleaned.reminderAt : undefined),
    });
  } catch (error) {
    if (notificationId) await cancelReminder(notificationId).catch(() => undefined);
    throw error;
  }
}

export async function deleteAgendaItem(repos: Repositories, item: AgendaItem): Promise<void> {
  await repos.agenda.delete(item.id);
  if (item.notificationId) {
    await cancelReminder(item.notificationId).catch(() => undefined);
  }
  if (item.type === 'event' && item.deviceEventId) {
    await deleteDeviceEvent(item.deviceEventId).catch(() => undefined);
  }
}

export async function createAgendaTask(
  repos: Repositories,
  input: CreateTaskInput & { remind?: boolean },
): Promise<TaskItem> {
  let notificationId: string | undefined;
  let reminderAt: string | undefined;

  if (input.remind && input.time) {
    const when = localDateTime(input.date, input.time);
    if (when) {
      notificationId = (await scheduleReminder(input.title, input.details, when)) ?? undefined;
      if (notificationId) reminderAt = when.toISOString();
    }
  } else if (input.notificationId) {
    notificationId = input.notificationId;
    reminderAt = input.reminderAt;
  }

  try {
    return await repos.agenda.createTask({
      ...input,
      notificationId,
      reminderAt,
    });
  } catch (error) {
    if (notificationId) await cancelReminder(notificationId).catch(() => undefined);
    throw error;
  }
}

export async function createAgendaEvent(
  repos: Repositories,
  input: CreateEventInput & {
    device?: CreateDeviceEventInput;
    remind?: boolean;
  },
): Promise<EventItem> {
  let deviceEventId: string | undefined = input.deviceEventId;
  let notificationId: string | undefined;
  let reminderAt: string | undefined;

  if (input.device && !deviceEventId) {
    deviceEventId = (await createDeviceEvent(input.device).catch(() => null)) ?? undefined;
  }

  if (input.remind) {
    const when = input.time
      ? localDateTime(input.date, input.time)
      : (input.device?.startDate ?? null);
    if (when) {
      notificationId = (await scheduleReminder(input.title, input.details, when)) ?? undefined;
      if (notificationId) reminderAt = when.toISOString();
    }
  } else if (input.notificationId) {
    notificationId = input.notificationId;
    reminderAt = input.reminderAt;
  }

  try {
    return await repos.agenda.createEvent({
      ...input,
      deviceEventId,
      notificationId,
      reminderAt,
    });
  } catch (error) {
    if (notificationId) await cancelReminder(notificationId).catch(() => undefined);
    if (deviceEventId) await deleteDeviceEvent(deviceEventId).catch(() => undefined);
    throw error;
  }
}
