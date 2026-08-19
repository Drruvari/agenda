import type { DatabaseClient } from '@/data/database/types';

import { type AgendaRepository, createAgendaRepository } from './agenda.repository';
import { createNotesRepository, type NotesRepository } from './notes.repository';
import { createRoutinesRepository, type RoutinesRepository } from './routines.repository';
import { createSpacesRepository, type SpacesRepository } from './spaces.repository';

export type Repositories = {
  agenda: AgendaRepository;
  notes: NotesRepository;
  routines: RoutinesRepository;
  spaces: SpacesRepository;
};

export function createRepositories(db: DatabaseClient): Repositories {
  return {
    agenda: createAgendaRepository(db),
    notes: createNotesRepository(db),
    routines: createRoutinesRepository(db),
    spaces: createSpacesRepository(db),
  };
}
