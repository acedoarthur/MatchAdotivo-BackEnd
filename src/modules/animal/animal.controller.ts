import type { Request, Response } from 'express';
import type { Database } from '../../prisma/db';
import type { CrudController } from '../../shared/crud.routes';
import { lerId } from '../../shared/validacao';
import { contaDe } from '../../middlewares/autorizar';
import { filtroTipoSchema } from './animal.schema';
import { animalService } from './animal.service';
import type { CreateAnimalDTO, UpdateAnimalDTO } from './animal.types';

type Handler = (req: Request, res: Response) => Promise<void>;

export function animalController(db: Database): CrudController & { porTipo: Handler; vacinas: Handler } {
  const service = animalService(db);
  return {
    getAll: async (req, res) => { res.json(await service.getAll(contaDe(res))); },
    getById: async (req, res) => { res.json(await service.buscar(contaDe(res), lerId(req))); },
    create: async (req, res) => {
      const data: CreateAnimalDTO = req.body;
      const novo = await service.create(contaDe(res), data);
      res.location(`/animais/${novo.id_animal}`).status(201).json(novo);
    },
    update: async (req, res) => {
      const data: UpdateAnimalDTO = req.body;
      res.json(await service.update(contaDe(res), lerId(req), data));
    },
    remove: async (req, res) => {
      await service.delete(contaDe(res), lerId(req));
      res.status(204).send();
    },
    porTipo: async (req, res) => {
      const { tipo } = filtroTipoSchema.parse({ tipo: req.params.tipo });
      res.json(await service.findByTipo(contaDe(res), tipo));
    },
    vacinas: async (req, res) => { res.json(await service.historico(contaDe(res), lerId(req))); },
  };
}
