import type { Database, Transaction } from '../../prisma/db';
import { escrever, executor } from '../../shared/repository';
import type { CreateVacinaDTO, UpdateVacinaDTO } from './vacina.types';

export function vacinaRepository(db: Database, tx?: Transaction) {
  const Vacinas = executor(db, tx).Vacina;
  return {
    findAll: () => Vacinas.orderBy((v) => v.id_vacina.asc()).all(),
    findById: (id_vacina: number) => Vacinas.where({ id_vacina }).first(),
    create: (data: CreateVacinaDTO) => escrever(() => Vacinas.create(data)),
    update: (id_vacina: number, data: UpdateVacinaDTO) => escrever(() => Vacinas.where({ id_vacina }).update(data)),
    delete: (id_vacina: number) => escrever(() => Vacinas.where({ id_vacina }).delete()),
  };
}
