import { Router } from 'express';
import type { Database } from '../../prisma/db';
import { crudRoutes } from '../../shared/crud.routes';
import { idParamsSchema } from '../../shared/schemas';
import { validate } from '../../middlewares/validate';
import { matchController } from './match.controller';
import { createMatchSchema, updateMatchSchema } from './match.schema';

export default function matchRoutes(db: Database): Router {
  const router = Router();
  const controller = matchController(db);
  // Precisa vir antes de "/:id"; senão "hoje" seria lido como um id.
  router.get('/hoje', controller.hoje);
  router.patch('/:id/status', validate(idParamsSchema, 'params'), validate(updateMatchSchema), controller.update);
  router.use(crudRoutes(controller, { create: createMatchSchema, update: updateMatchSchema }));
  return router;
}
