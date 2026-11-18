import type { Database } from '../../prisma/db';
import type { CrudController } from '../../shared/crud.routes';
import { lerId } from '../../shared/validacao';
import { vacinaService } from './vacina.service';
import type { CreateVacinaDTO, UpdateVacinaDTO } from './vacina.types';

export function vacinaController(db: Database): CrudController {
  const service = vacinaService(db);
  return {
    getAll: async (req, res) => { res.json(await service.getAll()); },
    getById: async (req, res) => { res.json(await service.findById(lerId(req))); },
    create: async (req, res) => {
      const data: CreateVacinaDTO = req.body;
      const novo = await service.create(data);
      res.location(`/vacinas/${novo.id_vacina}`).status(201).json(novo);
    },
    update: async (req, res) => {
      const data: UpdateVacinaDTO = req.body;
      res.json(await service.update(lerId(req), data));
    },
    remove: async (req, res) => {
      await service.delete(lerId(req));
      res.status(204).send();
    },
  };
}
