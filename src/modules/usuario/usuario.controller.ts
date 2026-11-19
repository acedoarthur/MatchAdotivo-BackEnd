import type { Request, Response } from 'express';
import type { Database } from '../../prisma/db';
import { contaDe } from '../../middlewares/autorizar';
import { usuarioService } from './usuario.service';
import type { CreateUsuarioDTO, LoginDTO, PerfilDTO } from './usuario.types';

export function usuarioController(db: Database) {
  const service = usuarioService(db);
  return {
    getAll: async (req: Request, res: Response) => { res.json(await service.getAll()); },
    me: async (req: Request, res: Response) => { res.json(await service.findById(contaDe(res).id_usuario)); },
    create: async (req: Request, res: Response) => {
      const data: CreateUsuarioDTO = req.body;
      res.status(201).location('/usuarios/me').json(await service.create(data));
    },
    login: async (req: Request, res: Response) => {
      const data: LoginDTO = req.body;
      res.json(await service.login(data));
    },
    completarPerfil: async (req: Request, res: Response) => {
      const data: PerfilDTO = req.body;
      res.json(await service.completarPerfil(contaDe(res), data));
    },
    logout: (req: Request, res: Response) => {
      // O middleware autenticar guardou o token em res.locals.
      service.logout(res.locals.token);
      res.json({ message: 'Logout realizado com sucesso' });
    },
  };
}
