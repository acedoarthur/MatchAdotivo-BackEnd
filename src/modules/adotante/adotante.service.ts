import type { Database } from '../../prisma/db';
import { ConflictError } from '../../shared/errors';
import { encontrado } from '../../shared/validacao';
import { adotanteRepository } from './adotante.repo';
import { coerenciaAnimaisSchema } from './adotante.schema';
import type { CreateAdotanteDTO, UpdateAdotanteDTO } from './adotante.types';

export function adotanteService(db: Database) {
  const repo = adotanteRepository(db);
  const service = {
    getAll: () => repo.findAll(),

    // O adotante precisa existir; senão, NotFoundError (404).
    findById: async (id: number) => encontrado(await repo.findById(id)),

    // RN02: o CPF não pode se repetir. O índice único do banco é a rede de segurança
    // para cadastros simultâneos (o repository traduz o erro 23505 em 409).
    create: async (data: CreateAdotanteDTO) => {
      if (await repo.findByCpf(data.cpf)) throw new ConflictError('CPF já cadastrado');
      return repo.create(data);
    },

    update: async (id: number, data: UpdateAdotanteDTO) => {
      const atual = await service.findById(id);
      if (data.cpf) {
        const comCpf = await repo.findByCpf(data.cpf);
        if (comCpf && comCpf.id_adotante !== id) throw new ConflictError('CPF já utilizado por outro adotante');
      }
      // RN06 vale para o conjunto: a atualização parcial é combinada com o que já está gravado.
      coerenciaAnimaisSchema.parse({
        possui_animais: data.possui_animais ?? atual.possui_animais,
        quantidade_animais: data.quantidade_animais ?? atual.quantidade_animais,
      });
      return encontrado(await repo.update(id, data));
    },

    // Adotantes com matches são protegidos pelo banco (409).
    delete: async (id: number) => {
      await service.findById(id);
      return encontrado(await repo.delete(id));
    },
  };
  return service;
}
