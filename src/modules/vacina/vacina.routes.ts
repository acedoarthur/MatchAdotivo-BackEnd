import type { Database } from '../../prisma/db';
import { crudRoutes } from '../../shared/crud.routes';
import { vacinaController } from './vacina.controller';
import { createVacinaSchema, updateVacinaSchema } from './vacina.schema';

export default (db: Database) => crudRoutes(vacinaController(db), {
  create: createVacinaSchema,
  update: updateVacinaSchema,
});
