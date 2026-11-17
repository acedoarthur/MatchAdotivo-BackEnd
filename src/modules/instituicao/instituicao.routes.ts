import type { Database } from '../../prisma/db';
import { crudRoutes } from '../../shared/crud.routes';
import { instituicaoController } from './instituicao.controller';
import { createInstituicaoSchema, updateInstituicaoSchema } from './instituicao.schema';

export default (db: Database) => crudRoutes(instituicaoController(db), {
  create: createInstituicaoSchema,
  update: updateInstituicaoSchema,
});
