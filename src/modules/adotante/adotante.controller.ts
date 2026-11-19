import type { Database } from '../../prisma/db';
import type { CrudController } from '../../shared/crud.routes';
import { lerId } from '../../shared/validacao';
import { contaDe } from '../../middlewares/autorizar';
import { adotanteService } from './adotante.service';
import type { CreateAdotanteDTO, UpdateAdotanteDTO } from './adotante.types';

export function adotanteController(db: Database): CrudController {
  const service = adotanteService(db);
  return {
    getAll: async (req, res) => { res.json(await service.getAll(contaDe(res))); },
    getById: async (req, res) => { res.json(await service.buscar(contaDe(res), lerId(req))); },
    create: async (req, res) => {
      const data: CreateAdotanteDTO = req.body;
      const novo = await service.create(data);
      res.location(`/adotantes/${novo.id_adotante}`).status(201).json(novo);
    },
    update: async (req, res) => {
      const data: UpdateAdotanteDTO = req.body;
      res.json(await service.update(contaDe(res), lerId(req), data));
    },
    remove: async (req, res) => {
      await service.delete(lerId(req));
      res.status(204).send();
    },
  };
}
