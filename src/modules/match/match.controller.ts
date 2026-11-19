import type { Request, Response } from 'express';
import type { Database } from '../../prisma/db';
import type { CrudController } from '../../shared/crud.routes';
import { lerId } from '../../shared/validacao';
import { contaDe } from '../../middlewares/autorizar';
import { matchService } from './match.service';
import type { SolicitarMatchDTO, UpdateMatchDTO } from './match.types';

export function matchController(db: Database): CrudController & { hoje: (req: Request, res: Response) => Promise<void> } {
  const service = matchService(db);
  return {
    getAll: async (req, res) => { res.json(await service.getAll(contaDe(res))); },
    hoje: async (req, res) => { res.json(await service.findPedidosHoje(contaDe(res))); },
    getById: async (req, res) => { res.json(await service.buscar(contaDe(res), lerId(req))); },
    create: async (req, res) => {
      const data: SolicitarMatchDTO = req.body;
      const novo = await service.solicitar(contaDe(res), data);
      res.location(`/matches/${novo.id_match}`).status(201).json(novo);
    },
    update: async (req, res) => {
      const { status }: UpdateMatchDTO = req.body;
      res.json(await service.alterarStatus(contaDe(res), lerId(req), status!));
    },
    remove: async (req, res) => {
      await service.delete(contaDe(res), lerId(req));
      res.status(204).send();
    },
  };
}
