import type { Database, Transaction } from '../../prisma/db';
import { escrever, executor } from '../../shared/repository';
import type { CreateAdotanteDTO, UpdateAdotanteDTO } from './adotante.types';

export function adotanteRepository(db: Database, tx?: Transaction) {
  const Adotantes = executor(db, tx).Adotante;
  return {
    findAll: () => Adotantes.orderBy((a) => a.id_adotante.asc()).all(),
    findById: (id_adotante: number) => Adotantes.where({ id_adotante }).first(),
    // RN02: o CPF é único, então a busca retorna no máximo um adotante (ou null). Informe somente os 11 dígitos.
    findByCpf: (cpf: CreateAdotanteDTO['cpf']) => Adotantes.where({ cpf }).first(),
    create: (data: CreateAdotanteDTO) => escrever(() => Adotantes.create(data)),
    update: (id_adotante: number, data: UpdateAdotanteDTO) => escrever(() => Adotantes.where({ id_adotante }).update(data)),
    delete: (id_adotante: number) => escrever(() => Adotantes.where({ id_adotante }).delete()),
  };
}
