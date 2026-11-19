import type { Database } from '../../prisma/db';
import { crudRoutes } from '../../shared/crud.routes';
import { animalVacinaController } from './animal-vacina.controller';
import { createAnimalVacinaSchema, updateAnimalVacinaSchema } from './animal-vacina.schema';

// Vacinações: instituição (somente os próprios animais) e administrador.
const gestao = ['INSTITUICAO', 'ADMIN'] as const;
export const permissoesAnimalVacina = { getAll: gestao, getById: gestao, create: gestao, update: gestao, remove: gestao };

export default (db: Database) => crudRoutes(animalVacinaController(db), {
  create: createAnimalVacinaSchema,
  update: updateAnimalVacinaSchema,
}, permissoesAnimalVacina);
