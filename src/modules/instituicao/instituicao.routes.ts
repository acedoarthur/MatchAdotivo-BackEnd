import type { Database } from '../../prisma/db';
import { crudRoutes } from '../../shared/crud.routes';
import { instituicaoController } from './instituicao.controller';
import { createInstituicaoSchema, updateInstituicaoSchema } from './instituicao.schema';

// Instituições se cadastram em POST /usuarios; o cadastro avulso e a exclusão são do administrador.
export const permissoesInstituicao = {
  getAll: ['ADOTANTE', 'INSTITUICAO', 'ADMIN'],
  getById: ['ADOTANTE', 'INSTITUICAO', 'ADMIN'],
  create: ['ADMIN'],
  update: ['INSTITUICAO', 'ADMIN'],
  remove: ['ADMIN'],
} as const;

export default (db: Database) => crudRoutes(instituicaoController(db), {
  create: createInstituicaoSchema,
  update: updateInstituicaoSchema,
}, permissoesInstituicao);
