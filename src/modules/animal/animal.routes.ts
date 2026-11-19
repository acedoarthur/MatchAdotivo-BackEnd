import { Router } from 'express';
import type { Database } from '../../prisma/db';
import { crudRoutes } from '../../shared/crud.routes';
import { idParamsSchema } from '../../shared/schemas';
import { validate } from '../../middlewares/validate';
import { exigirPerfil } from '../../middlewares/autorizar';
import { animalController } from './animal.controller';
import { createAnimalSchema, updateAnimalSchema } from './animal.schema';

// Leitura para todos (cada perfil vê o seu escopo); escrita da instituição dona ou do administrador.
export const permissoesAnimal = {
  getAll: ['ADOTANTE', 'INSTITUICAO', 'ADMIN'],
  getById: ['ADOTANTE', 'INSTITUICAO', 'ADMIN'],
  create: ['INSTITUICAO', 'ADMIN'],
  update: ['INSTITUICAO', 'ADMIN'],
  remove: ['INSTITUICAO', 'ADMIN'],
} as const;

export default function animalRoutes(db: Database): Router {
  const router = Router();
  const controller = animalController(db);
  const leitura = exigirPerfil(...permissoesAnimal.getAll);
  router.get('/tipo/:tipo', leitura, controller.porTipo);
  router.get('/:id/vacinas', leitura, validate(idParamsSchema, 'params'), controller.vacinas);
  router.use(crudRoutes(controller, { create: createAnimalSchema, update: updateAnimalSchema }, permissoesAnimal));
  return router;
}
