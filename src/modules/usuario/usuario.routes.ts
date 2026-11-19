import { Router } from 'express';
import type { Database } from '../../prisma/db';
import { autenticar } from '../../middlewares/autenticar';
import { exigirPerfil, identificar } from '../../middlewares/autorizar';
import { validate } from '../../middlewares/validate';
import { usuarioController } from './usuario.controller';
import { createUsuarioSchema, loginSchema, perfilSchema } from './usuario.schema';

export default function usuarioRoutes(db: Database): Router {
  const router = Router();
  const controller = usuarioController(db);
  const conta = [autenticar, identificar(db)];
  // Rotas públicas: cadastro (somente adotante ou instituição) e login
  router.post('/', validate(createUsuarioSchema), controller.create);
  router.post('/login', validate(loginSchema), controller.login);
  // Rotas protegidas: valem também para contas sem perfil, que precisam concluí-lo
  router.post('/logout', autenticar, controller.logout);
  router.get('/me', ...conta, controller.me);
  router.post('/perfil', ...conta, validate(perfilSchema), controller.completarPerfil);
  // A lista de contas expõe e-mails: somente o administrador.
  router.get('/', ...conta, exigirPerfil('ADMIN'), controller.getAll);
  return router;
}
