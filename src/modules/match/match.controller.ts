import type { Database } from '../../prisma/db';
import type { CrudController } from '../../shared/crud.routes';
import { lerId, encontrado } from '../../shared/validacao';
import type { CreateMatchDTO, UpdateMatchDTO } from './match.types';
import { criarMatch, alterarStatusMatch, excluirMatch } from './match.service';

export function matchController(db: Database): CrudController {
  const model = db.orm.public.Match;
  return {
    getAll: async (req, res) => { res.json(await model.orderBy((m) => m.id_match.asc()).all()); },
    getById: async (req, res) => { res.json(encontrado(await model.where({ id_match: lerId(req) }).first())); },
    create: async (req, res) => {
      const data: CreateMatchDTO = req.body;
      const novo = await criarMatch(db, data);
      res.location(`/matches/${novo.id_match}`).status(201).json(novo);
    },
    update: async (req, res) => {
      const id_match = lerId(req);
      const { status }: UpdateMatchDTO = req.body;
      res.json(await alterarStatusMatch(db, id_match, status!));
    },
    remove: async (req, res) => {
      await excluirMatch(db, lerId(req));
      res.status(204).send();
    },
  };
}
