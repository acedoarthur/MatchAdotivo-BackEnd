import type { Database, Transaction } from '../../prisma/db';
import { escrever, executor } from '../../shared/repository';
import type { CreateAnimalDTO, UpdateAnimalDTO } from './animal.types';

export function animalRepository(db: Database, tx?: Transaction) {
  const Animais = executor(db, tx).Animal;
  return {
    findAll: () => Animais.orderBy((a) => a.id_animal.asc()).all(),
    findById: (id_animal: number) => Animais.where({ id_animal }).first(),
    // O tipo é gravado em minúsculas: o chamador já o normalizou.
    findByTipo: (tipo: CreateAnimalDTO['tipo']) => Animais.where({ tipo }).all(),
    create: (data: CreateAnimalDTO) => escrever(() => Animais.create(data)),
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
