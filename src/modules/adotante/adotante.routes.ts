import type { Database } from '../../prisma/db';
import { crudRoutes } from '../../shared/crud.routes';
import { adotanteController } from './adotante.controller';
import { createAdotanteSchema, updateAdotanteSchema } from './adotante.schema';

export default (db: Database) => crudRoutes(adotanteController(db), {
  create: createAdotanteSchema,
  update: updateAdotanteSchema,
});
