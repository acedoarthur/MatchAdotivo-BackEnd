import type { Database, Transaction } from '../../prisma/db';
import { escrever, executor } from '../../shared/repository';
import type { CreateInstituicaoDTO, UpdateInstituicaoDTO } from './instituicao.types';

export function instituicaoRepository(db: Database, tx?: Transaction) {
  const Instituicoes = executor(db, tx).Instituicao;
  return {
    findAll: () => Instituicoes.orderBy((i) => i.id_instituicao.asc()).all(),
    // Retorna a instituição ou null se não existir
    findById: (id_instituicao: number) => Instituicoes.where({ id_instituicao }).first(),
    // RN02: o CNPJ é único, então retorna uma instituição ou null. Informe somente os 14 dígitos.
    findByCnpj: (cnpj: CreateInstituicaoDTO['cnpj']) => Instituicoes.where({ cnpj }).first(),
    create: (data: CreateInstituicaoDTO) => escrever(() => Instituicoes.create(data)),
    // Retorna a instituição atualizada ou null se não existir
    update: (id_instituicao: number, data: UpdateInstituicaoDTO) => escrever(() => Instituicoes.where({ id_instituicao }).update(data)),
    // Retorna a instituição removida ou null se não existir
    delete: (id_instituicao: number) => escrever(() => Instituicoes.where({ id_instituicao }).delete()),
  };
}
