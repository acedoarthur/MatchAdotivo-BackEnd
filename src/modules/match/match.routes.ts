import { Router } from 'express';
import type { Database } from '../../prisma/db';
import { crudRoutes } from '../../shared/crud.routes';
import { idParamsSchema } from '../../shared/schemas';
import { validate } from '../../middlewares/validate';
import { exigirPerfil } from '../../middlewares/autorizar';
import { matchController } from './match.controller';
import { solicitarMatchSchema, updateMatchSchema } from './match.schema';

// O adotante solicita e acompanha; a instituição do animal aprova ou recusa; o administrador gerencia todos.
export const permissoesMatch = {
  getAll: ['ADOTANTE', 'INSTITUICAO', 'ADMIN'],
  getById: ['ADOTANTE', 'INSTITUICAO', 'ADMIN'],
  create: ['ADOTANTE', 'ADMIN'],
  update: ['INSTITUICAO', 'ADMIN'],
  remove: ['INSTITUICAO', 'ADMIN'],
} as const;

export default function matchRoutes(db: Database): Router {
  const router = Router();
  const controller = matchController(db);
  // Precisa vir antes de "/:id"; senão "hoje" seria lido como um id.
  router.get('/hoje', exigirPerfil(...permissoesMatch.getAll), controller.hoje);
  router.patch('/:id/status', exigirPerfil(...permissoesMatch.update), validate(idParamsSchema, 'params'), validate(updateMatchSchema), controller.update);
  router.use(crudRoutes(controller, { create: solicitarMatchSchema, update: updateMatchSchema }, permissoesMatch));
  return router;
}
