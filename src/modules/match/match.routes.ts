import { Router } from 'express';
import type { Database } from '../../prisma/db';
import { crudRoutes } from '../../shared/crud.routes';
import { idParamsSchema } from '../../shared/schemas';
import { validate } from '../../shared/validate';
import { matchController } from './match.controller';
import { createMatchSchema, updateMatchSchema } from './match.schema';

export default function matchRoutes(db: Database): Router {
  const router = Router();
  const controller = matchController(db);
  router.patch('/:id/status', validate(idParamsSchema, 'params'), validate(updateMatchSchema), controller.update);
  router.use(crudRoutes(controller, { create: createMatchSchema, update: updateMatchSchema }));
  return router;
}
