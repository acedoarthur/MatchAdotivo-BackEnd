import type { Database } from '../../prisma/db';
import { encontrado } from '../../shared/validacao';
import { animalService } from '../animal/animal.service';
import { vacinaService } from '../vacina/vacina.service';
import { animalVacinaRepository } from './animal-vacina.repo';
import type { CreateAnimalVacinaDTO, UpdateAnimalVacinaDTO } from './animal-vacina.types';

export function animalVacinaService(db: Database) {
  const repo = animalVacinaRepository(db);
  const animais = animalService(db);
  const vacinas = vacinaService(db);
  // O animal e a vacina informados precisam existir; na atualização parcial só se conferem os enviados.
  async function referenciasExistem(dados: Partial<CreateAnimalVacinaDTO>) {
    if (dados.id_animal !== undefined) await animais.findById(dados.id_animal);
    if (dados.id_vacina !== undefined) await vacinas.findById(dados.id_vacina);
  }
  const service = {
    getAll: () => repo.findAll(),
    findById: async (id: number) => encontrado(await repo.findById(id)),
    // RN05: a mesma vacina pode ser aplicada mais de uma vez; cada dose é um registro.
    create: async (data: CreateAnimalVacinaDTO) => {
      await referenciasExistem(data);
      return repo.create(data);
    },
    update: async (id: number, data: UpdateAnimalVacinaDTO) => {
      await service.findById(id);
      await referenciasExistem(data);
      return encontrado(await repo.update(id, data));
    },
    delete: async (id: number) => {
      await service.findById(id);
      return encontrado(await repo.delete(id));
    },
  };
  return service;
}
