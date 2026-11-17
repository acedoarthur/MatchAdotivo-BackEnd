import { Router, type RequestHandler } from 'express';
import type { z } from 'zod';
import { validate } from './validate';
import { idParamsSchema } from './schemas';

export interface CrudController {
  getAll: RequestHandler;
  getById: RequestHandler;
  create: RequestHandler;
  update: RequestHandler;
  remove: RequestHandler;
}

export interface CrudSchemas {
  create: z.ZodType;
  update: z.ZodType;
}

export function crudRoutes(controller: CrudController, schemas: CrudSchemas): Router {
  const router = Router();
  router.get('/', controller.getAll);
  const id = validate(idParamsSchema, 'params');
  router.get('/:id', id, controller.getById);
  router.post('/', validate(schemas.create), controller.create);
  // No PUT, primeiro o :id e depois o corpo.
  router.put('/:id', id, validate(schemas.update), controller.update);
  router.delete('/:id', id, controller.remove);
  return router;
}
