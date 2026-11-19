import type { Database, Transaction } from '../../prisma/db';
import { escrever, executor } from '../../shared/repository';
import { APROVADO } from '../match/match.types';
import type { CreateAnimalDTO, UpdateAnimalDTO } from './animal.types';

/** Filtros da listagem; combinados com E. */
export interface FiltroAnimais {
  tipo?: CreateAnimalDTO['tipo'];
  id_instituicao?: number;
  /** Somente animais sem adoção aprovada. */
  disponiveis?: boolean;
}

export function animalRepository(db: Database, tx?: Transaction) {
  const Animais = executor(db, tx).Animal;
  const filtrar = ({ tipo, id_instituicao, disponiveis }: FiltroAnimais) => {
    let consulta = Animais.orderBy((a) => a.id_animal.asc());
    // O tipo é gravado em minúsculas: o chamador já o normalizou.
    if (tipo !== undefined) consulta = consulta.where({ tipo });
    if (id_instituicao !== undefined) consulta = consulta.where({ id_instituicao });
    if (disponiveis) consulta = consulta.where((a) => a.matches.none((m) => m.status.eq(APROVADO)));
    return consulta.all();
  };
  return {
    findAll: (filtro: FiltroAnimais = {}) => filtrar(filtro),
    findById: (id_animal: number) => Animais.where({ id_animal }).first(),
    existsByInstituicao: async (id_instituicao: number) => (await Animais.select('id_animal').where({ id_instituicao }).first()) !== null,
    findByTipo: (tipo: CreateAnimalDTO['tipo']) => filtrar({ tipo }),
    create: (data: CreateAnimalDTO & { id_instituicao: number }) => escrever(() => Animais.create(data)),
    update: (id_animal: number, data: UpdateAnimalDTO) => escrever(() => Animais.where({ id_animal }).update(data)),
    delete: (id_animal: number) => escrever(() => Animais.where({ id_animal }).delete()),
    /**
     * Bloqueia a linha do animal até o fim da transação (SELECT ... FOR UPDATE),
     * serializando os pedidos e aprovações concorrentes do mesmo animal.
     * Retorna o animal ou null se não existir. Exige uma transação.
     */
    bloquear: async (id_animal: number) => {
      if (!tx) throw new Error('bloquear exige uma transação aberta.');
      await tx.query(db.raw.sql`SELECT id_animal FROM animais WHERE id_animal = ${id_animal} FOR UPDATE`
        .returnsRow({ id_animal: 'pg/int4@1' }).build());
      return Animais.where({ id_animal }).first();
    },
  };
}
