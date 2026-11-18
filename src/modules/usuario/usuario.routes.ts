import { Router } from 'express';
import type { Database } from '../../prisma/db';
import { autenticar } from '../../shared/autenticar';
import { validate } from '../../shared/validate';
import { usuarioController } from './usuario.controller';
import { createUsuarioSchema, loginSchema } from './usuario.schema';

export default function usuarioRoutes(db: Database): Router {
  const router = Router();
  const controller = usuarioController(db);
  // Rotas públicas: cadastro e login (sem elas ninguém obteria o primeiro token)
  router.post('/', validate(createUsuarioSchema), controller.create);
  router.post('/login', validate(loginSchema), controller.login);
  // Rotas protegidas: exigem o token
  router.post('/logout', autenticar, controller.logout);
  router.get('/', autenticar, controller.getAll);
  return router;
}
