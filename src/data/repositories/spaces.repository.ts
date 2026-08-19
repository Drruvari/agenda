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

function compareSpaces(left: Space, right: Space): number {
  return left.order - right.order || left.name.localeCompare(right.name);
}

export function createSpacesRepository(db: DatabaseClient) {
  async function list(): Promise<Space[]> {
    const spaces = await db.getAll<Space>('spaces');

    return spaces.sort(compareSpaces);
  }

  async function getById(id: string): Promise<Space | null> {
    return db.getById<Space>('spaces', id);
  }

  async function create(input: CreateSpaceInput): Promise<Space> {
    const spaces = await list();

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
  }

  async function update(space: Space): Promise<Space> {
    const next: Space = {
      ...space,
      name: space.name.trim(),
    };

    await db.put('spaces', next);

    return next;
  }

  async function deleteSpace(id: string): Promise<void> {
    await db.delete('spaces', id);
  }

  return {
    list,
    getById,
    create,
    update,
    delete: deleteSpace,
  };
}

export type SpacesRepository = ReturnType<typeof createSpacesRepository>;
