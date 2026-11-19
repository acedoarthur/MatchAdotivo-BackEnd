import type { Database } from '../../prisma/db';
import type { CrudController } from '../../shared/crud.routes';
import { lerId } from '../../shared/validacao';
import { contaDe } from '../../middlewares/autorizar';
import { instituicaoService } from './instituicao.service';
import type { CreateInstituicaoDTO, UpdateInstituicaoDTO } from './instituicao.types';

/*
Controller: lê a requisição, chama o service e monta a resposta HTTP. Não há try/catch:
os erros lançados pelo service (404, 409...) seguem para o tratador de erros (Express 5).
O corpo e o :id já chegam validados e convertidos pelo middleware validate.
*/
export function instituicaoController(db: Database): CrudController {
  const service = instituicaoService(db);
  return {
    getAll: async (req, res) => { res.json(await service.getAll()); },
    getById: async (req, res) => { res.json(await service.findById(lerId(req))); },
    create: async (req, res) => {
      const data: CreateInstituicaoDTO = req.body;
      const novo = await service.create(data);
      res.location(`/instituicoes/${novo.id_instituicao}`).status(201).json(novo);
    },
    update: async (req, res) => {
      const data: UpdateInstituicaoDTO = req.body;
      res.json(await service.update(contaDe(res), lerId(req), data));
    },
    remove: async (req, res) => {
      await service.delete(lerId(req));
      res.status(204).send();
    },
  };
}
