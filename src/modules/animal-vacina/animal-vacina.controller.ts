import type { Database } from '../../prisma/db';
import type { CrudController } from '../../shared/crud.routes';
import { lerId } from '../../shared/validacao';
import { contaDe } from '../../middlewares/autorizar';
import { animalVacinaService } from './animal-vacina.service';
import type { CreateAnimalVacinaDTO, UpdateAnimalVacinaDTO } from './animal-vacina.types';

export function animalVacinaController(db: Database): CrudController {
  const service = animalVacinaService(db);
  return {
    getAll: async (req, res) => { res.json(await service.getAll(contaDe(res))); },
    getById: async (req, res) => { res.json(await service.findById(contaDe(res), lerId(req))); },
    create: async (req, res) => {
      const data: CreateAnimalVacinaDTO = req.body;
      const novo = await service.create(contaDe(res), data);
      res.location(`/animais-vacinas/${novo.id_animal_vacina}`).status(201).json(novo);
    },
    update: async (req, res) => {
      const data: UpdateAnimalVacinaDTO = req.body;
      res.json(await service.update(contaDe(res), lerId(req), data));
    },
    remove: async (req, res) => {
      await service.delete(contaDe(res), lerId(req));
      res.status(204).send();
    },
  };
}
