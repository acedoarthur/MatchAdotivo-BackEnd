import type { Request, Response } from 'express';
import type { Database } from '../../prisma/db';
import type { CrudController } from '../../shared/crud.routes';
import { lerId } from '../../shared/validacao';
import { matchService } from './match.service';
import type { CreateMatchDTO, UpdateMatchDTO } from './match.types';

export function matchController(db: Database): CrudController & { hoje: (req: Request, res: Response) => Promise<void> } {
  const service = matchService(db);
  return {
    getAll: async (req, res) => { res.json(await service.getAll()); },
    hoje: async (req, res) => { res.json(await service.findPedidosHoje()); },
    getById: async (req, res) => { res.json(await service.findById(lerId(req))); },
    create: async (req, res) => {
      const data: CreateMatchDTO = req.body;
      const novo = await service.create(data);
      res.location(`/matches/${novo.id_match}`).status(201).json(novo);
    },
    update: async (req, res) => {
      const { status }: UpdateMatchDTO = req.body;
      res.json(await service.updateStatus(lerId(req), status!));
    },
    remove: async (req, res) => {
      await service.delete(lerId(req));
      res.status(204).send();
    },
  };
}
