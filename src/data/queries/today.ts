import type { Repositories } from '@/data/repositories';
import type { TaskItem, TodayViewModel } from '@/data/schema/types';

export async function loadTodayView(
  repos: Repositories,
  date: string,
  activeSpaceId: string | null,
  /** When true, completed tasks move to `completed`. When false, they stay in all-day/scheduled. */
  separateCompleted = true,
): Promise<TodayViewModel> {
  const [spaces, items, routines, completions, dailyNote] = await Promise.all([
    repos.spaces.list(),
    repos.agenda.forDate(date, activeSpaceId),
    repos.routines.listActive(),
    repos.routines.completionsForDate(date),
    repos.notes.getByDate(date),
  ]);

  const completedIds = new Set(completions.map((entry) => entry.routineId));
  const spaceNameById = new Map(spaces.map((space) => [space.id, space.name]));

  const isSeparatedCompleted = (item: (typeof items)[number]) =>
    separateCompleted && item.type === 'task' && item.completed;

  const allDay = items.filter((item) => {
    if (isSeparatedCompleted(item)) return false;
    return !item.time;
  });

  const scheduled = items.filter((item) => {
    if (isSeparatedCompleted(item)) return false;
    return Boolean(item.time);
  });

  const completed = separateCompleted
    ? items.filter((item): item is TaskItem => item.type === 'task' && item.completed)
    : [];

  return {
    date,
    spaces,
    allDay,
    scheduled,
    completed,
    routines: routines.map((routine) => ({
      routine,
      completed: completedIds.has(routine.id),
      spaceName: routine.spaceId ? spaceNameById.get(routine.spaceId) : undefined,
    })),
    dailyNote,
  };
}
