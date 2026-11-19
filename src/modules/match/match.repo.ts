import 'temporal-polyfill/global';
import type { Database, Transaction } from '../../prisma/db';
import { escrever, executor } from '../../shared/repository';
import { APROVADO, type CreateMatchDTO, type EscopoMatch } from './match.types';

export function matchRepository(db: Database, tx?: Transaction) {
  const Matches = executor(db, tx).Match;
  const doEscopo = (escopo: EscopoMatch) => {
    if ('id_adotante' in escopo) return Matches.where({ id_adotante: escopo.id_adotante });
    if ('id_instituicao' in escopo) return Matches.where((m) => m.animal.some((a) => a.id_instituicao.eq(escopo.id_instituicao)));
    return Matches;
  };
  return {
    findAll: (escopo: EscopoMatch = {}) => doEscopo(escopo).orderBy((m) => m.id_match.asc()).all(),
    findById: (id_match: number) => Matches.where({ id_match }).first(),
    // RN04: o match APROVADO do animal, se houver (no máximo um, também garantido por índice único parcial).
    findAprovadoByAnimal: (id_animal: number) => Matches.where({ id_animal, status: APROVADO }).first(),
    existsByAdotanteAnimal: async (id_adotante: number, id_animal: number) =>
      (await Matches.select('id_match').where({ id_adotante, id_animal }).first()) !== null,
    // Pedidos feitos "hoje" no fuso de Brasília: o banco guarda UTC (3 horas à frente), então o
    // dia é calculado em America/Sao_Paulo e convertido para Temporal.Instant.
    findPedidosHoje: (escopo: EscopoMatch = {}) => {
      const fuso = 'America/Sao_Paulo';
      const hoje = Temporal.Now.plainDateISO(fuso);
      const inicio = hoje.toZonedDateTime(fuso).toInstant();
      const fim = hoje.add({ days: 1 }).toZonedDateTime(fuso).toInstant();
      return doEscopo(escopo).where((m) => m.data_pedido.gte(inicio)).where((m) => m.data_pedido.lt(fim)).orderBy((m) => m.id_match.asc()).all();
    },
    // data_pedido e o status inicial PENDENTE são gerados pelo banco.
    create: (data: CreateMatchDTO) => escrever(() => Matches.create(data)),
    updateStatus: (id_match: number, status: typeof APROVADO) => escrever(() => Matches.where({ id_match }).update({ status })),
    delete: (id_match: number) => escrever(() => Matches.where({ id_match }).delete()),
  };
}
