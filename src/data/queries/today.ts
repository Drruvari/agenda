import type { Repositories } from '@/data/repositories/repositories';
import type { AgendaItem, TaskItem, TodayViewModel } from '@/data/schema/types';
import { matchesRoutineSpaceFilter } from '@/data/spaces/spaceFilter';

export type LoadTodayViewOptions = {
  includeCompleted?: boolean;
  separateCompleted?: boolean;
};

type ResolvedOptions = Required<LoadTodayViewOptions>;

function resolveOptions(options: boolean | LoadTodayViewOptions): ResolvedOptions {
  if (typeof options === 'boolean') {
    return {
      includeCompleted: true,
      separateCompleted: options,
    };
  }

  return {
    includeCompleted: options.includeCompleted ?? true,
    separateCompleted: options.separateCompleted ?? true,
  };
}

function isCompletedTask(item: AgendaItem): item is TaskItem {
  return item.type === 'task' && item.completed;
}

export async function loadTodayView(
  repos: Repositories,
  date: string,
  activeSpaceId: string | null,
  options: boolean | LoadTodayViewOptions = true,
): Promise<TodayViewModel> {
  const resolved = resolveOptions(options);

  const [spaces, items, routines, completions, dailyNote] = await Promise.all([
    repos.spaces.list(),
    repos.agenda.forDate(date, activeSpaceId),
    repos.routines.listActive(),
    repos.routines.completionsForDate(date),
    repos.notes.getByDate(date),
  ]);

  const completedRoutineIds = new Set(completions.map((completion) => completion.routineId));

  const spaceNames = new Map(spaces.map((space) => [space.id, space.name]));

  const visibleItems = resolved.includeCompleted
    ? items
    : items.filter((item) => !isCompletedTask(item));

  const activeItems = resolved.separateCompleted
    ? visibleItems.filter((item) => !isCompletedTask(item))
    : visibleItems;

  const completed =
    resolved.includeCompleted && resolved.separateCompleted
      ? visibleItems.filter(isCompletedTask)
      : [];

  const allDay = activeItems.filter((item) => !item.time);

  const scheduled = activeItems.filter((item) => Boolean(item.time));

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
      completed: completedRoutineIds.has(routine.id),
      spaceName: routine.spaceId ? spaceNames.get(routine.spaceId) : undefined,
    })),
    dailyNote,
  };
}
