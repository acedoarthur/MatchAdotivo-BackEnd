import type { Database, Transaction } from '../../prisma/db';
import type { Varchar } from '@prisma/orm-postgres/target/codec-types';
import { exigir, encontrado } from '../../shared/validacao';
import { APROVADO, type CreateMatchDTO } from './match.types';

async function bloquearAnimal(db: Database, tx: Transaction, id_animal: number) {
  await tx.query(db.raw.sql`SELECT id_animal FROM animais WHERE id_animal = ${id_animal} FOR UPDATE`
    .returnsRow({ id_animal: 'pg/int4@1' }).build());
  encontrado(await tx.orm.public.Animal.where({ id_animal }).first());
}

// Os dados chegam validados pelos schemas Zod (API) ou pelo comando de adoção (console).
export function criarMatch(db: Database, dados: CreateMatchDTO) {
  return db.transaction(async (tx) => {
    await bloquearAnimal(db, tx, dados.id_animal);
    encontrado(await tx.orm.public.Adotante.where({ id_adotante: dados.id_adotante }).first());
    const aprovado = await tx.orm.public.Match.where({ id_animal: dados.id_animal, status: APROVADO }).first();
    exigir(!aprovado, 'Este animal já possui uma adoção aprovada.', 409);
    return tx.orm.public.Match.create(dados);
  });
}

export function alterarStatusMatch(db: Database, id_match: number, status: Varchar<20>) {
  return db.transaction(async (tx) => {
    const atual = encontrado(await tx.orm.public.Match.where({ id_match }).first());
    await bloquearAnimal(db, tx, atual.id_animal);
    if (status === 'APROVADO') {
      const aprovado = await tx.orm.public.Match.where({ id_animal: atual.id_animal, status: APROVADO }).first();
      exigir(!aprovado || aprovado.id_match === id_match, 'Este animal já possui outra adoção aprovada.', 409);
    }
    return encontrado(await tx.orm.public.Match.where({ id_match }).update({ status }));
  });
}

export function excluirMatch(db: Database, id_match: number) {
  return db.transaction(async (tx) => {
    const atual = encontrado(await tx.orm.public.Match.where({ id_match }).first());
    await bloquearAnimal(db, tx, atual.id_animal);
    return encontrado(await tx.orm.public.Match.where({ id_match }).delete());
  });
}
