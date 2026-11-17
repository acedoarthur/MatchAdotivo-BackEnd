import type { Database } from '../../prisma/db';
import type { CrudController } from '../../shared/crud.routes';
import { lerId, encontrado } from '../../shared/validacao';
import type { CreateAnimalDTO, UpdateAnimalDTO } from './animal.types';

export function animalController(db: Database): CrudController {
  const model = db.orm.public.Animal;
  // RN01: todo animal pertence a uma instituição existente.
  async function instituicaoExiste(id_instituicao: number) {
    encontrado(await db.orm.public.Instituicao.where({ id_instituicao }).first());
  }
  return {
    getAll: async (req, res) => { res.json(await model.orderBy((a) => a.id_animal.asc()).all()); },
    getById: async (req, res) => { res.json(encontrado(await model.where({ id_animal: lerId(req) }).first())); },
    create: async (req, res) => {
      const data: CreateAnimalDTO = req.body;
      await instituicaoExiste(data.id_instituicao);
      const novo = await model.create(data);
      res.location(`/animais/${novo.id_animal}`).status(201).json(novo);
    },
    update: async (req, res) => {
      const id_animal = lerId(req);
      const data: UpdateAnimalDTO = req.body;
      encontrado(await model.where({ id_animal }).first());
      if (data.id_instituicao !== undefined) await instituicaoExiste(data.id_instituicao);
      res.json(encontrado(await model.where({ id_animal }).update(data)));
    },
    remove: async (req, res) => {
      encontrado(await model.where({ id_animal: lerId(req) }).delete());
      res.status(204).send();
    },
  };
}
