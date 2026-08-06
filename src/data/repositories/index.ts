import type { DatabaseClient } from '@/data/database/types';

import { createAgendaRepository } from './agenda.repository';
import { createNotesRepository } from './notes.repository';
import { createRoutinesRepository } from './routines.repository';
import { createSpacesRepository } from './spaces.repository';

export function createRepositories(db: DatabaseClient) {
  return {
    agenda: createAgendaRepository(db),
    spaces: createSpacesRepository(db),
    routines: createRoutinesRepository(db),
    notes: createNotesRepository(db),
  };
}

export type Repositories = ReturnType<typeof createRepositories>;

export type { AgendaRepository } from './agenda.repository';
export type { NotesRepository } from './notes.repository';
export type { RoutinesRepository } from './routines.repository';
export type { SpacesRepository } from './spaces.repository';
