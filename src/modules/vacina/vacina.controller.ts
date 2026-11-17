import type { Database } from '../../prisma/db';
import type { CrudController } from '../../shared/crud.routes';
import { lerId, encontrado } from '../../shared/validacao';
import type { CreateVacinaDTO, UpdateVacinaDTO } from './vacina.types';

export function vacinaController(db: Database): CrudController {
  const model = db.orm.public.Vacina;
  return {
    getAll: async (req, res) => { res.json(await model.orderBy((v) => v.id_vacina.asc()).all()); },
    getById: async (req, res) => { res.json(encontrado(await model.where({ id_vacina: lerId(req) }).first())); },
    create: async (req, res) => {
      const data: CreateVacinaDTO = req.body;
      const novo = await model.create(data);
      res.location(`/vacinas/${novo.id_vacina}`).status(201).json(novo);
    },
    update: async (req, res) => {
      const id_vacina = lerId(req);
      const data: UpdateVacinaDTO = req.body;
      res.json(encontrado(await model.where({ id_vacina }).update(data)));
    },
    remove: async (req, res) => {
      encontrado(await model.where({ id_vacina: lerId(req) }).delete());
      res.status(204).send();
    },
  };
}
