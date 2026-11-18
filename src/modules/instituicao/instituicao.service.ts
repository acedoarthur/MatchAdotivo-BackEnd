import type { Database } from '../../prisma/db';
import { ConflictError } from '../../shared/errors';
import { encontrado } from '../../shared/validacao';
import { instituicaoRepository } from './instituicao.repo';
import type { CreateInstituicaoDTO, UpdateInstituicaoDTO } from './instituicao.types';

/*
Regras de negócio da instituição. O service não conhece o HTTP: recebe dados, aplica as
regras e devolve o resultado ou lança um erro da aplicação (404, 409...).
*/
export function instituicaoService(db: Database) {
  const repo = instituicaoRepository(db);
  const service = {
    getAll: () => repo.findAll(),

    // A instituição precisa existir; senão, NotFoundError (404).
    findById: async (id: number) => encontrado(await repo.findById(id)),

    // RN02: o CNPJ não pode se repetir. O índice único do banco é a rede de segurança
    // para cadastros simultâneos (o repository traduz o erro 23505 em 409).
    create: async (data: CreateInstituicaoDTO) => {
      if (await repo.findByCnpj(data.cnpj)) throw new ConflictError('CNPJ já cadastrado');
      return repo.create(data);
    },

    // A instituição precisa existir e o novo CNPJ não pode pertencer a outra.
    update: async (id: number, data: UpdateInstituicaoDTO) => {
      await service.findById(id);
      if (data.cnpj) {
        const comCnpj = await repo.findByCnpj(data.cnpj);
        if (comCnpj && comCnpj.id_instituicao !== id) throw new ConflictError('CNPJ já utilizado por outra instituição');
      }
      return encontrado(await repo.update(id, data));
    },

    // Instituições com animais são protegidas pelo banco (onDelete: Restrict → 409).
    delete: async (id: number) => {
      await service.findById(id);
      return encontrado(await repo.delete(id));
    },
  };
  return service;
}
