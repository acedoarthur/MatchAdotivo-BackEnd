import type { Database } from '../../prisma/db';
import { encontrado } from '../../shared/validacao';
import { animalService } from '../animal/animal.service';
import { vacinaService } from '../vacina/vacina.service';
import type { Conta } from '../usuario/usuario.types';
import { animalVacinaRepository } from './animal-vacina.repo';
import type { CreateAnimalVacinaDTO, UpdateAnimalVacinaDTO } from './animal-vacina.types';

// Rotas da instituição e do administrador: a instituição só registra doses dos próprios animais.
export function animalVacinaService(db: Database) {
  const repo = animalVacinaRepository(db);
  const animais = animalService(db);
  const vacinas = vacinaService(db);
  // O animal (da conta) e a vacina informados precisam existir; na atualização parcial só se conferem os enviados.
  async function referenciasValidas(conta: Conta, dados: Partial<CreateAnimalVacinaDTO>) {
    if (dados.id_animal !== undefined) await animais.propria(conta, dados.id_animal);
    if (dados.id_vacina !== undefined) await vacinas.findById(dados.id_vacina);
  }
  const service = {
    getAll: (conta: Conta) => repo.findAll(conta.perfil === 'INSTITUICAO' ? conta.id_instituicao : undefined),
    // 404 se não existe; 403 se a dose é de animal de outra instituição.
    findById: async (conta: Conta, id: number) => {
      const aplicacao = encontrado(await repo.findById(id));
      await animais.propria(conta, aplicacao.id_animal);
      return aplicacao;
    },
    // RN05: a mesma vacina pode ser aplicada mais de uma vez; cada dose é um registro.
    create: async (conta: Conta, data: CreateAnimalVacinaDTO) => {
      await referenciasValidas(conta, data);
      return repo.create(data);
    },
    update: async (conta: Conta, id: number, data: UpdateAnimalVacinaDTO) => {
      await service.findById(conta, id);
      await referenciasValidas(conta, data);
      return encontrado(await repo.update(id, data));
    },
    delete: async (conta: Conta, id: number) => {
      await service.findById(conta, id);
      return encontrado(await repo.delete(id));
    },
  };
  return service;
}
