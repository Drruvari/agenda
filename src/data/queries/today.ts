import type { Repositories } from '@/data/repositories';
import type { TaskItem, TodayViewModel } from '@/data/schema/types';
import { matchesRoutineSpaceFilter } from '@/data/spaces/spaceFilter';

export type LoadTodayViewOptions = {
  includeCompleted?: boolean;
  separateCompleted?: boolean;
};

export async function loadTodayView(
  repos: Repositories,
  date: string,
  activeSpaceId: string | null,
  options: boolean | LoadTodayViewOptions = true,
): Promise<TodayViewModel> {
  const resolved: Required<LoadTodayViewOptions> =
    typeof options === 'boolean'
      ? {
          // Legacy positional flag meant "separate completed into its own list".
          includeCompleted: true,
          separateCompleted: options,
        }
      : {
          includeCompleted: options.includeCompleted ?? true,
          separateCompleted: options.separateCompleted ?? true,
        };

  const [spaces, items, routines, completions, dailyNote] = await Promise.all([
    repos.spaces.list(),
    repos.agenda.forDate(date, activeSpaceId),
    repos.routines.listActive(),
    repos.routines.completionsForDate(date),
    repos.notes.getByDate(date),
  ]);

  const completedIds = new Set(completions.map((entry) => entry.routineId));
  const spaceNameById = new Map(spaces.map((space) => [space.id, space.name]));

  const visibleItems = resolved.includeCompleted
    ? items
    : items.filter((item) => !(item.type === 'task' && item.completed));

  const isSeparatedCompleted = (item: (typeof visibleItems)[number]) =>
    resolved.separateCompleted && item.type === 'task' && item.completed;

  const allDay = visibleItems.filter((item) => {
    if (isSeparatedCompleted(item)) return false;
    return !item.time;
  });

  const scheduled = visibleItems.filter((item) => {
    if (isSeparatedCompleted(item)) return false;
    return Boolean(item.time);
  });

  const completed =
    resolved.includeCompleted && resolved.separateCompleted
      ? visibleItems.filter((item): item is TaskItem => item.type === 'task' && item.completed)
      : [];

  const visibleRoutines = routines.filter((routine) =>
    matchesRoutineSpaceFilter(routine.spaceId, activeSpaceId),
  );

  return {
    date,
    spaces,
    allDay,
    scheduled,
    completed,
    routines: visibleRoutines.map((routine) => ({
      routine,
      completed: completedIds.has(routine.id),
      spaceName: routine.spaceId ? spaceNameById.get(routine.spaceId) : undefined,
    })),
    dailyNote,
  };
}
