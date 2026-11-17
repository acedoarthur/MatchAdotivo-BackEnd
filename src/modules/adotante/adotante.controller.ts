import type { Database } from '../../prisma/db';
import type { CrudController } from '../../shared/crud.routes';
import { lerId, encontrado } from '../../shared/validacao';
import { coerenciaAnimaisSchema } from './adotante.schema';
import type { CreateAdotanteDTO, UpdateAdotanteDTO } from './adotante.types';

export function adotanteController(db: Database): CrudController {
  const model = db.orm.public.Adotante;
  return {
    getAll: async (req, res) => { res.json(await model.orderBy((a) => a.id_adotante.asc()).all()); },
    getById: async (req, res) => { res.json(encontrado(await model.where({ id_adotante: lerId(req) }).first())); },
    create: async (req, res) => {
      const data: CreateAdotanteDTO = req.body;
      const novo = await model.create(data);
      res.location(`/adotantes/${novo.id_adotante}`).status(201).json(novo);
    },
    update: async (req, res) => {
      const id_adotante = lerId(req);
      const data: UpdateAdotanteDTO = req.body;
      const atual = encontrado(await model.where({ id_adotante }).first());
      // RN06 vale para o conjunto: a atualização parcial é combinada com o que já está gravado.
      coerenciaAnimaisSchema.parse({
        possui_animais: data.possui_animais ?? atual.possui_animais,
        quantidade_animais: data.quantidade_animais ?? atual.quantidade_animais,
      });
      res.json(encontrado(await model.where({ id_adotante }).update(data)));
    },
    remove: async (req, res) => {
      encontrado(await model.where({ id_adotante: lerId(req) }).delete());
      res.status(204).send();
    },
  };
}
