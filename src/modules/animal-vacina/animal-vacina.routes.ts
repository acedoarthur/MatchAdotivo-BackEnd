import type { Database } from '../../prisma/db';
import { crudRoutes } from '../../shared/crud.routes';
import { animalVacinaController } from './animal-vacina.controller';
import { createAnimalVacinaSchema, updateAnimalVacinaSchema } from './animal-vacina.schema';

export default (db: Database) => crudRoutes(animalVacinaController(db), {
  create: createAnimalVacinaSchema,
  update: updateAnimalVacinaSchema,
});
