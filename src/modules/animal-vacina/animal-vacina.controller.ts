import type { Database } from '../../prisma/db';
import type { CrudController } from '../../shared/crud.routes';
import { lerId, encontrado } from '../../shared/validacao';
import type { CreateAnimalVacinaDTO, UpdateAnimalVacinaDTO } from './animal-vacina.types';

export function animalVacinaController(db: Database): CrudController {
  const model = db.orm.public.AnimalVacina;
  // Confere apenas as referências informadas: na atualização parcial, as demais não mudam.
  async function referencias(dados: Partial<CreateAnimalVacinaDTO>) {
    if (dados.id_animal !== undefined) encontrado(await db.orm.public.Animal.where({ id_animal: dados.id_animal }).first());
    if (dados.id_vacina !== undefined) encontrado(await db.orm.public.Vacina.where({ id_vacina: dados.id_vacina }).first());
  }
  return {
    getAll: async (req, res) => { res.json(await model.orderBy((v) => v.id_animal_vacina.asc()).all()); },
    getById: async (req, res) => { res.json(encontrado(await model.where({ id_animal_vacina: lerId(req) }).first())); },
    create: async (req, res) => {
      const data: CreateAnimalVacinaDTO = req.body;
      await referencias(data);
      const novo = await model.create(data);
      res.location(`/animais-vacinas/${novo.id_animal_vacina}`).status(201).json(novo);
    },
    update: async (req, res) => {
      const id_animal_vacina = lerId(req);
      const data: UpdateAnimalVacinaDTO = req.body;
      encontrado(await model.where({ id_animal_vacina }).first());
      await referencias(data);
      res.json(encontrado(await model.where({ id_animal_vacina }).update(data)));
    },
    remove: async (req, res) => {
      encontrado(await model.where({ id_animal_vacina: lerId(req) }).delete());
      res.status(204).send();
    },
  };
}
