import type { Database } from '../../prisma/db';
import type { Varchar } from '@prisma/orm-postgres/target/codec-types';
import { ConflictError } from '../../shared/errors';
import { emTransacao } from '../../shared/repository';
import { encontrado } from '../../shared/validacao';
import { adotanteRepository } from '../adotante/adotante.repo';
import { animalRepository } from '../animal/animal.repo';
import { matchRepository } from './match.repo';
import { APROVADO, type CreateMatchDTO } from './match.types';

/*
Regras de negócio do match (RN03 e RN04). O acesso ao banco fica nos repositories;
as operações de escrita rodam em uma transação com a linha do animal bloqueada.
*/
export function matchService(db: Database) {
  const repo = matchRepository(db);
  return {
    getAll: () => repo.findAll(),

    // O match precisa existir; senão, NotFoundError (404).
    findById: async (id: number) => encontrado(await repo.findById(id)),

    // Pedidos feitos hoje (fuso de Brasília).
    findPedidosHoje: () => repo.findPedidosHoje(),

    // RN03: um adotante e um animal existentes. RN04: animal com adoção aprovada não recebe pedidos.
    create: (dados: CreateMatchDTO) => emTransacao(db, async (tx) => {
      encontrado(await animalRepository(db, tx).bloquear(dados.id_animal));
      encontrado(await adotanteRepository(db, tx).findById(dados.id_adotante));
      const matches = matchRepository(db, tx);
      if (await matches.findAprovadoByAnimal(dados.id_animal)) throw new ConflictError('Este animal já possui uma adoção aprovada.');
      return matches.create(dados);
    }),

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

    delete: (id_match: number) => emTransacao(db, async (tx) => {
      const matches = matchRepository(db, tx);
      const atual = encontrado(await matches.findById(id_match));
      encontrado(await animalRepository(db, tx).bloquear(atual.id_animal));
      return encontrado(await matches.delete(id_match));
    }),
  };
}
