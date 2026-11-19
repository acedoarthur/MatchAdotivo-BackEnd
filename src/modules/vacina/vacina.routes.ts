import type { Database } from '../../prisma/db';
import { crudRoutes } from '../../shared/crud.routes';
import { vacinaController } from './vacina.controller';
import { createVacinaSchema, updateVacinaSchema } from './vacina.schema';

// Catálogo compartilhado: todos consultam; instituições e o administrador mantêm.
export const permissoesVacina = {
  getAll: ['ADOTANTE', 'INSTITUICAO', 'ADMIN'],
  getById: ['ADOTANTE', 'INSTITUICAO', 'ADMIN'],
  create: ['INSTITUICAO', 'ADMIN'],
  update: ['INSTITUICAO', 'ADMIN'],
  remove: ['INSTITUICAO', 'ADMIN'],
} as const;

export default (db: Database) => crudRoutes(vacinaController(db), {
  create: createVacinaSchema,
  update: updateVacinaSchema,
}, permissoesVacina);
