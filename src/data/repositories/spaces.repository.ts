import type { DatabaseClient } from '@/data/database/types';
import { createId, nowIso } from '@/data/schema/ids';
import type { Space } from '@/data/schema/types';

export type CreateSpaceInput = {
  name: string;
  color: string;
  icon?: string;
  isPinned?: boolean;
  isSystem?: boolean;
  order?: number;
};

export function createSpacesRepository(db: DatabaseClient) {
  return {
    async list(): Promise<Space[]> {
      const spaces = await db.getAll<Space>('spaces');
      return spaces.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
    },

    async getById(id: string): Promise<Space | null> {
      return db.getById<Space>('spaces', id);
    },

    async create(input: CreateSpaceInput): Promise<Space> {
      const spaces = await this.list();
      const space: Space = {
        id: createId(),
        name: input.name.trim(),
        color: input.color,
        icon: input.icon,
        isPinned: input.isPinned ?? true,
        isSystem: input.isSystem,
        order: input.order ?? spaces.length,
        createdAt: nowIso(),
      };
      await db.put('spaces', space);
      return space;
    },

    async update(space: Space): Promise<Space> {
      await db.put('spaces', space);
      return space;
    },

    async delete(id: string): Promise<void> {
      await db.delete('spaces', id);
    },
  };
}

export type SpacesRepository = ReturnType<typeof createSpacesRepository>;
