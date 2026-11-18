import type { Database } from '../../prisma/db';
import { encontrado } from '../../shared/validacao';
import { animalVacinaRepository } from '../animal-vacina/animal-vacina.repo';
import { instituicaoService } from '../instituicao/instituicao.service';
import { animalRepository } from './animal.repo';
import type { CreateAnimalDTO, UpdateAnimalDTO } from './animal.types';

export function animalService(db: Database) {
  const repo = animalRepository(db);
  const aplicacoes = animalVacinaRepository(db);
  const instituicoes = instituicaoService(db);
  const service = {
    getAll: () => repo.findAll(),

    // O animal precisa existir; senão, NotFoundError (404).
    findById: async (id: number) => encontrado(await repo.findById(id)),

    findByTipo: (tipo: CreateAnimalDTO['tipo']) => repo.findByTipo(tipo),

    // RN05: o histórico lista cada dose individualmente, com os dados da vacina.
    findVacinas: async (id: number) => {
      await service.findById(id);
      return aplicacoes.findByAnimalComVacina(id);
    },

    // RN01: todo animal pertence a uma instituição existente.
    create: async (data: CreateAnimalDTO) => {
      await instituicoes.findById(data.id_instituicao);
      return repo.create(data);
    },

    update: async (id: number, data: UpdateAnimalDTO) => {
      await service.findById(id);
      if (data.id_instituicao !== undefined) await instituicoes.findById(data.id_instituicao);
      return encontrado(await repo.update(id, data));
    },

    // Animais com vacinações ou matches são protegidos pelo banco (409).
    delete: async (id: number) => {
      await service.findById(id);
      return encontrado(await repo.delete(id));
    },
  };
  return service;
}
