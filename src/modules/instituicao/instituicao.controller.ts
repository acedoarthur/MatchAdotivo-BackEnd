import type { Database } from '../../prisma/db';
import type { CrudController } from '../../shared/crud.routes';
import { lerId, encontrado } from '../../shared/validacao';
import type { CreateInstituicaoDTO, UpdateInstituicaoDTO } from './instituicao.types';

// Os corpos de POST e PUT já chegam validados e convertidos pelo middleware validate.
export function instituicaoController(db: Database): CrudController {
  const model = db.orm.public.Instituicao;
  return {
    getAll: async (req, res) => { res.json(await model.orderBy((i) => i.id_instituicao.asc()).all()); },
    getById: async (req, res) => { res.json(encontrado(await model.where({ id_instituicao: lerId(req) }).first())); },
    create: async (req, res) => {
      const data: CreateInstituicaoDTO = req.body;
      const novo = await model.create(data);
      res.location(`/instituicoes/${novo.id_instituicao}`).status(201).json(novo);
    },
    update: async (req, res) => {
      const id_instituicao = lerId(req);
      const data: UpdateInstituicaoDTO = req.body;
      res.json(encontrado(await model.where({ id_instituicao }).update(data)));
    },
    remove: async (req, res) => {
      encontrado(await model.where({ id_instituicao: lerId(req) }).delete());
      res.status(204).send();
    },
  };
}
