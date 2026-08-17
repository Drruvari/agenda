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

function reminderWhen(item: Pick<AgendaItem, 'date' | 'time'>): Date | null {
  return item.time ? localDateTime(item.date, item.time) : null;
}

async function scheduleForItem(
  item: Pick<AgendaItem, 'title' | 'details' | 'date' | 'time'>,
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

  const notificationId = completed.notificationId ?? task.notificationId;
  if (!notificationId) return completed;

  try {
    await cancelReminder(notificationId);
  } catch {
    return completed;
  }

  return (await repos.agenda.update({
    ...completed,
    notificationId: undefined,
  })) as TaskItem;
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

  try {
    return (await repos.agenda.update({
      ...restored,
      notificationId: scheduled.notificationId,
      reminderAt: scheduled.reminderAt ?? restored.reminderAt,
    })) as TaskItem;
  } catch (error) {
    await cancelReminder(scheduled.notificationId).catch(() => undefined);
    throw error;
  }
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
    const saved = await repos.agenda.update({
      ...cleaned,
      notificationId,
      reminderAt: reminderAt ?? (notificationId ? cleaned.reminderAt : undefined),
    });

    if (previous.notificationId && previous.notificationId !== notificationId) {
      await cancelReminder(previous.notificationId).catch(() => undefined);
    }

    return saved;
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
  let notificationId = input.notificationId;
  let reminderAt = input.reminderAt;
  let createdNotificationId: string | undefined;

  try {
    if (input.remind && input.time) {
      const scheduled = await scheduleForItem(input);
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
    if (createdNotificationId) {
      await cancelReminder(createdNotificationId).catch(() => undefined);
    }
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
      const scheduled = await scheduleForItem(input);
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
    if (createdNotificationId) {
      await cancelReminder(createdNotificationId).catch(() => undefined);
    }
    if (createdDeviceEventId) {
      await deleteDeviceEvent(createdDeviceEventId).catch(() => undefined);
    }
    throw error;
  }
}
