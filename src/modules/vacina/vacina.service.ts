import type { Database } from '../../prisma/db';
import { encontrado } from '../../shared/validacao';
import { vacinaRepository } from './vacina.repo';
import type { CreateVacinaDTO, UpdateVacinaDTO } from './vacina.types';

export function vacinaService(db: Database) {
  const repo = vacinaRepository(db);
  const service = {
    getAll: () => repo.findAll(),
    // A vacina precisa existir; senão, NotFoundError (404).
    findById: async (id: number) => encontrado(await repo.findById(id)),
    create: (data: CreateVacinaDTO) => repo.create(data),
    update: async (id: number, data: UpdateVacinaDTO) => {
      await service.findById(id);
      return encontrado(await repo.update(id, data));
    },
    // Vacinas com aplicações registradas são protegidas pelo banco (409).
    delete: async (id: number) => {
      await service.findById(id);
      return encontrado(await repo.delete(id));
    },
  };
  return service;
}
