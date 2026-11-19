import type { Database } from '../../prisma/db';
import { crudRoutes } from '../../shared/crud.routes';
import { adotanteController } from './adotante.controller';
import { createAdotanteSchema, updateAdotanteSchema } from './adotante.schema';

// Adotantes se cadastram em POST /usuarios; o cadastro avulso e a exclusão são do administrador.
export const permissoesAdotante = {
  getAll: ['ADOTANTE', 'INSTITUICAO', 'ADMIN'],
  getById: ['ADOTANTE', 'INSTITUICAO', 'ADMIN'],
  create: ['ADMIN'],
  update: ['ADOTANTE', 'ADMIN'],
  remove: ['ADMIN'],
} as const;

export default (db: Database) => crudRoutes(adotanteController(db), {
  create: createAdotanteSchema,
  update: updateAdotanteSchema,
}, permissoesAdotante);
