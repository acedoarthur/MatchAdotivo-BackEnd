import { Router, type RequestHandler } from 'express';
import type { z } from 'zod';
import { validate } from '../middlewares/validate';
import { exigirPerfil } from '../middlewares/autorizar';
import type { Perfil } from '../modules/usuario/usuario.types';
import { idParamsSchema } from './schemas';

export interface CrudController {
  getAll: RequestHandler;
  getById: RequestHandler;
  create: RequestHandler;
  update: RequestHandler;
  remove: RequestHandler;
}

export interface CrudSchemas {
  create?: z.ZodType;
  update?: z.ZodType;
}

/** Perfis autorizados em cada ação. Ação sem perfis não tem rota. A propriedade dos registros é conferida nos services. */
export type Permissoes = Partial<Record<keyof CrudController, readonly Perfil[]>>;

export function crudRoutes(controller: Partial<CrudController>, schemas: CrudSchemas, permissoes: Permissoes): Router {
  const router = Router();
  const id = validate(idParamsSchema, 'params');
  // O perfil é conferido antes de validar o :id e o corpo.
  const rota = (acao: keyof CrudController, ...validacoes: RequestHandler[]): RequestHandler[] =>
    [exigirPerfil(...permissoes[acao]!), ...validacoes, controller[acao]!];
  if (permissoes.getAll) router.get('/', ...rota('getAll'));
  if (permissoes.getById) router.get('/:id', ...rota('getById', id));
  if (permissoes.create) router.post('/', ...rota('create', validate(schemas.create!)));
  // No PUT, primeiro o :id e depois o corpo.
  if (permissoes.update) router.put('/:id', ...rota('update', id, validate(schemas.update!)));
  if (permissoes.remove) router.delete('/:id', ...rota('remove', id));
  return router;
}
