import type { DatabaseClient } from '@/data/database/types';
import { createId, nowIso } from '@/data/schema/ids';
import type { Routine, RoutineCompletion } from '@/data/schema/types';

export type CreateRoutineInput = {
  name: string;
  spaceId?: string;
  order?: number;
};

function compareRoutines(left: Routine, right: Routine): number {
  return left.order - right.order || left.name.localeCompare(right.name);
}

export function createRoutinesRepository(db: DatabaseClient) {
  async function getById(id: string): Promise<Routine | null> {
    return db.getById<Routine>('routines', id);
  }

  async function listAll(): Promise<Routine[]> {
    const routines = await db.getAll<Routine>('routines');

    return routines.sort(compareRoutines);
  }

  async function listActive(): Promise<Routine[]> {
    const routines = await listAll();

    return routines.filter((routine) => routine.active);
  }

  async function create(input: CreateRoutineInput): Promise<Routine> {
    const routines = await listAll();
    const now = nowIso();

    const routine: Routine = {
      id: createId(),
      name: input.name.trim(),
      spaceId: input.spaceId,
      order: input.order ?? routines.length,
      active: true,
      createdAt: now,
      updatedAt: now,
    };

    await db.put('routines', routine);

    return routine;
  }

  async function update(routine: Routine): Promise<Routine> {
    const next: Routine = {
      ...routine,
      name: routine.name.trim(),
      updatedAt: nowIso(),
    };

    await db.put('routines', next);

    return next;
  }

  async function deleteRoutine(id: string): Promise<void> {
    await db.deleteWhere('routine_completions', {
      routineId: id,
    });

    await db.delete('routines', id);
  }

  async function completionsForDate(date: string): Promise<RoutineCompletion[]> {
    return db.findWhere<RoutineCompletion>('routine_completions', { date });
  }

  async function setCompleted(routineId: string, date: string, completed: boolean): Promise<void> {
    const key = `${routineId}::${date}`;

    if (!completed) {
      await db.delete('routine_completions', key);

      return;
    }

    const completion: RoutineCompletion = {
      routineId,
      date,
      completedAt: nowIso(),
    };

    await db.put('routine_completions', completion);
  }

  async function toggleCompletion(routineId: string, date: string): Promise<boolean> {
    const existing = await db.getById<RoutineCompletion>(
      'routine_completions',
      `${routineId}::${date}`,
    );

    const completed = !existing;

    await setCompleted(routineId, date, completed);

    return completed;
  }

  return {
    getById,
    listActive,
    listAll,
    create,
    update,
    delete: deleteRoutine,
    completionsForDate,
    setCompleted,
    toggleCompletion,
  };
}

export type RoutinesRepository = ReturnType<typeof createRoutinesRepository>;
