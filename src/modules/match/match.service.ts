import type { Database } from '../../prisma/db';
import type { Varchar } from '@prisma/orm-postgres/target/codec-types';
import { ConflictError } from '../../shared/errors';
import { emTransacao } from '../../shared/repository';
import { encontrado, exigir } from '../../shared/validacao';
import { adotanteRepository } from '../adotante/adotante.repo';
import { animalRepository } from '../animal/animal.repo';
import type { Conta } from '../usuario/usuario.types';
import { matchRepository } from './match.repo';
import { APROVADO, type CreateMatchDTO, type EscopoMatch, type SolicitarMatchDTO } from './match.types';

// Pedidos que cada perfil enxerga: os próprios (adotante), os dos seus animais (instituição) ou todos (administrador).
function escopo(conta: Conta): EscopoMatch {
  if (conta.perfil === 'ADOTANTE') return { id_adotante: conta.id_adotante };
  if (conta.perfil === 'INSTITUICAO') return { id_instituicao: conta.id_instituicao };
  return {};
}

/*
Regras de negócio do match (RN03 e RN04). O acesso ao banco fica nos repositories;
as operações de escrita rodam em uma transação com a linha do animal bloqueada.
*/
export function matchService(db: Database) {
  const repo = matchRepository(db);
  const animais = animalRepository(db);
  const service = {
    getAll: (conta: Conta) => repo.findAll(escopo(conta)),

    // O match precisa existir; senão, NotFoundError (404).
    findById: async (id: number) => encontrado(await repo.findById(id)),

    // 404 se não existe; 403 se o pedido é de outro adotante ou de animal de outra instituição.
    buscar: async (conta: Conta, id: number) => {
      const match = await service.findById(id);
      if (conta.perfil === 'ADOTANTE') exigir(match.id_adotante === conta.id_adotante, 'O pedido pertence a outro adotante.', 403);
      if (conta.perfil === 'INSTITUICAO') {
        const animal = encontrado(await animais.findById(match.id_animal));
        exigir(animal.id_instituicao === conta.id_instituicao, 'O pedido é para um animal de outra instituição.', 403);
      }
      return match;
    },

    // Pedidos feitos hoje (fuso de Brasília), no escopo do perfil.
    findPedidosHoje: (conta: Conta) => repo.findPedidosHoje(escopo(conta)),

    // O solicitante é o adotante logado; somente o administrador informa outro adotante.
    solicitar: (conta: Conta, { id_adotante, id_animal }: SolicitarMatchDTO) => {
      if (conta.perfil === 'ADOTANTE') {
        exigir(id_adotante === undefined || id_adotante === conta.id_adotante, 'O adotante só pode solicitar adoções para si mesmo.', 403);
        return service.create({ id_adotante: conta.id_adotante, id_animal });
      }
      exigir(id_adotante !== undefined, 'id_adotante é obrigatório para o administrador.');
      return service.create({ id_adotante, id_animal });
    },

    // RN03: um adotante e um animal existentes. RN04: animal com adoção aprovada não recebe pedidos.
    create: (dados: CreateMatchDTO) => emTransacao(db, async (tx) => {
      encontrado(await animalRepository(db, tx).bloquear(dados.id_animal));
      encontrado(await adotanteRepository(db, tx).findById(dados.id_adotante));
      const matches = matchRepository(db, tx);
      if (await matches.findAprovadoByAnimal(dados.id_animal)) throw new ConflictError('Este animal já possui uma adoção aprovada.');
      return matches.create(dados);
    }),

    // Aprovar ou recusar: somente a instituição do animal ou o administrador (rota).
    alterarStatus: async (conta: Conta, id_match: number, status: Varchar<20>) => {
      await service.buscar(conta, id_match);
      return service.updateStatus(id_match, status);
    },

    // RN04: no máximo um match APROVADO por animal.
    updateStatus: (id_match: number, status: Varchar<20>) => emTransacao(db, async (tx) => {
      const matches = matchRepository(db, tx);
      const atual = encontrado(await matches.findById(id_match));
      encontrado(await animalRepository(db, tx).bloquear(atual.id_animal));
      if (status === APROVADO) {
        const aprovado = await matches.findAprovadoByAnimal(atual.id_animal);
        if (aprovado && aprovado.id_match !== id_match) throw new ConflictError('Este animal já possui outra adoção aprovada.');
      }
      return encontrado(await matches.updateStatus(id_match, status));
    }),

    delete: async (conta: Conta, id_match: number) => {
      await service.buscar(conta, id_match);
      return emTransacao(db, async (tx) => {
        const matches = matchRepository(db, tx);
        const atual = encontrado(await matches.findById(id_match));
        encontrado(await animalRepository(db, tx).bloquear(atual.id_animal));
        return encontrado(await matches.delete(id_match));
      });
    },
  };
  return service;
}
