import { Router } from 'express';
import type { Database } from '../../prisma/db';
import { crudRoutes } from '../../shared/crud.routes';
import { idParamsSchema } from '../../shared/schemas';
import { validate } from '../../middlewares/validate';
import { animalController } from './animal.controller';
import { createAnimalSchema, updateAnimalSchema } from './animal.schema';

export default function animalRoutes(db: Database): Router {
  const router = Router();
  const controller = animalController(db);
  router.get('/tipo/:tipo', controller.porTipo);
  router.get('/:id/vacinas', validate(idParamsSchema, 'params'), controller.vacinas);
  router.use(crudRoutes(controller, { create: createAnimalSchema, update: updateAnimalSchema }));
  return router;
}
