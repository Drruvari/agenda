import type { DatabaseClient } from '@/data/database/types';
import { createId, nowIso } from '@/data/schema/ids';
import type { Routine, RoutineCompletion } from '@/data/schema/types';

export type CreateRoutineInput = {
  name: string;
  spaceId?: string;
  order?: number;
};

export function createRoutinesRepository(db: DatabaseClient) {
  return {
    async getById(id: string): Promise<Routine | null> {
      return db.getById<Routine>('routines', id);
    },

    async listActive(): Promise<Routine[]> {
      const routines = await db.getAll<Routine>('routines');
      return routines
        .filter((routine) => routine.active)
        .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
    },

    async listAll(): Promise<Routine[]> {
      const routines = await db.getAll<Routine>('routines');
      return routines.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
    },

    async create(input: CreateRoutineInput): Promise<Routine> {
      const now = nowIso();
      const existing = await this.listAll();
      const routine: Routine = {
        id: createId(),
        name: input.name.trim(),
        spaceId: input.spaceId,
        order: input.order ?? existing.length,
        active: true,
        createdAt: now,
        updatedAt: now,
      };
      await db.put('routines', routine);
      return routine;
    },

    async update(routine: Routine): Promise<Routine> {
      const next = { ...routine, updatedAt: nowIso() };
      await db.put('routines', next);
      return next;
    },

    async delete(id: string): Promise<void> {
      await db.deleteWhere('routine_completions', { routineId: id });
      await db.delete('routines', id);
    },

    async completionsForDate(date: string): Promise<RoutineCompletion[]> {
      return db.findWhere<RoutineCompletion>('routine_completions', { date });
    },

    async setCompleted(routineId: string, date: string, completed: boolean): Promise<void> {
      const key = `${routineId}::${date}`;
      if (completed) {
        const completion: RoutineCompletion = {
          routineId,
          date,
          completedAt: nowIso(),
        };
        await db.put('routine_completions', completion);
        return;
      }

      await db.delete('routine_completions', key);
    },

    async toggleCompletion(routineId: string, date: string): Promise<boolean> {
      const existing = await db.getById<RoutineCompletion>(
        'routine_completions',
        `${routineId}::${date}`,
      );
      const next = !existing;
      await this.setCompleted(routineId, date, next);
      return next;
    },
  };
}

export type RoutinesRepository = ReturnType<typeof createRoutinesRepository>;
