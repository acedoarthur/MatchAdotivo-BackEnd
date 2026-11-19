import type { Database } from '../../prisma/db';
import { encontrado, exigir } from '../../shared/validacao';
import { animalVacinaRepository } from '../animal-vacina/animal-vacina.repo';
import { instituicaoService } from '../instituicao/instituicao.service';
import { matchRepository } from '../match/match.repo';
import type { Conta } from '../usuario/usuario.types';
import { animalRepository, type FiltroAnimais } from './animal.repo';
import type { CreateAnimalDTO, UpdateAnimalDTO } from './animal.types';

// O que cada perfil enxerga: o adotante, os disponíveis; a instituição, os seus; o administrador, todos.
function escopo(conta: Conta): FiltroAnimais {
  if (conta.perfil === 'ADOTANTE') return { disponiveis: true };
  if (conta.perfil === 'INSTITUICAO') return { id_instituicao: conta.id_instituicao };
  return {};
}

// A instituição só gerencia os próprios animais; o administrador, todos.
function exigirDona(conta: Conta, id_instituicao: number) {
  exigir(conta.perfil === 'ADMIN' || conta.id_instituicao === id_instituicao, 'O animal pertence a outra instituição.', 403);
}

// Instituição responsável por um cadastro: a da conta logada, ou a informada pelo administrador.
function instituicaoResponsavel(conta: Conta, informada: number | undefined): number {
  if (conta.perfil === 'INSTITUICAO') {
    exigir(informada === undefined || informada === conta.id_instituicao, 'A instituição só pode cadastrar animais para si mesma.', 403);
    return conta.id_instituicao;
  }
  exigir(informada !== undefined, 'id_instituicao é obrigatório para o administrador.');
  return informada;
}

export function animalService(db: Database) {
  const repo = animalRepository(db);
  const aplicacoes = animalVacinaRepository(db);
  const matches = matchRepository(db);
  const instituicoes = instituicaoService(db);
  const service = {
    getAll: (conta: Conta) => repo.findAll(escopo(conta)),

    findByTipo: (conta: Conta, tipo: CreateAnimalDTO['tipo']) => repo.findAll({ ...escopo(conta), tipo }),

    // O animal precisa existir; senão, NotFoundError (404).
    findById: async (id: number) => encontrado(await repo.findById(id)),

    // 404 se não existe; 403 se o perfil não pode vê-lo. O adotante vê os disponíveis e os que ele pediu.
    buscar: async (conta: Conta, id: number) => {
      const animal = await service.findById(id);
      if (conta.perfil === 'INSTITUICAO') exigirDona(conta, animal.id_instituicao);
      if (conta.perfil === 'ADOTANTE') {
        const visivel = !(await matches.findAprovadoByAnimal(id)) || await matches.existsByAdotanteAnimal(conta.id_adotante, id);
        exigir(visivel, 'O animal não está disponível para adoção.', 403);
      }
      return animal;
    },

    // Animal gerenciável pela conta (instituição dona ou administrador).
    propria: async (conta: Conta, id: number) => {
      const animal = await service.findById(id);
      exigirDona(conta, animal.id_instituicao);
      return animal;
    },

    // RN05: o histórico lista cada dose individualmente, com os dados da vacina.
    findVacinas: async (id: number) => {
      await service.findById(id);
      return aplicacoes.findByAnimalComVacina(id);
    },

    historico: async (conta: Conta, id: number) => {
      await service.buscar(conta, id);
      return aplicacoes.findByAnimalComVacina(id);
    },

    // RN01: todo animal pertence a uma instituição existente, definida pela identidade.
    create: async (conta: Conta, data: CreateAnimalDTO) => {
      const id_instituicao = instituicaoResponsavel(conta, data.id_instituicao);
      await instituicoes.findById(id_instituicao);
      return repo.create({ ...data, id_instituicao });
    },

    update: async (conta: Conta, id: number, data: UpdateAnimalDTO) => {
      await service.propria(conta, id);
      if (data.id_instituicao !== undefined) await instituicoes.findById(instituicaoResponsavel(conta, data.id_instituicao));
      return encontrado(await repo.update(id, data));
    },

    // Animais com vacinações ou matches são protegidos pelo banco (409).
    delete: async (conta: Conta, id: number) => {
      await service.propria(conta, id);
      return encontrado(await repo.delete(id));
    },
  };
  return service;
}
