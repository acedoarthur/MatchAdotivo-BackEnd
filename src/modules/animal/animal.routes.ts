import { Router } from 'express';
import type { Database } from '../../prisma/db';
import { crudRoutes } from '../../shared/crud.routes';
import { idParamsSchema } from '../../shared/schemas';
import { validate } from '../../shared/validate';
import { encontrado, lerId } from '../../shared/validacao';
import { animalController } from './animal.controller';
import { createAnimalSchema, filtroTipoSchema, updateAnimalSchema } from './animal.schema';

export default function animalRoutes(db: Database): Router {
  const router = Router();
  router.get('/tipo/:tipo', async (req, res) => {
    const { tipo } = filtroTipoSchema.parse({ tipo: req.params.tipo });
    res.json(await db.orm.public.Animal.where({ tipo }).all());
  });
  router.get('/:id/vacinas', validate(idParamsSchema, 'params'), async (req, res) => {
    const id_animal = lerId(req);
    encontrado(await db.orm.public.Animal.where({ id_animal }).first());
    res.json(await db.orm.public.AnimalVacina.where({ id_animal }).include('vacina').all());
  });
  router.use(crudRoutes(animalController(db), { create: createAnimalSchema, update: updateAnimalSchema }));
  return router;
}
