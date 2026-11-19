import type { Database, Transaction } from '../../prisma/db';
import { ConflictError } from '../../shared/errors';
import { encontrado, exigir } from '../../shared/validacao';
import type { Conta } from '../usuario/usuario.types';
import { adotanteRepository } from './adotante.repo';
import { coerenciaAnimaisSchema } from './adotante.schema';
import type { CreateAdotanteDTO, UpdateAdotanteDTO } from './adotante.types';

export function adotanteService(db: Database, tx?: Transaction) {
  const repo = adotanteRepository(db, tx);
  const service = {
    // Dados pessoais: o adotante vê só o próprio cadastro; a instituição, quem pediu seus animais.
    getAll: async (conta: Conta) => {
      if (conta.perfil === 'ADOTANTE') return [encontrado(await repo.findById(conta.id_adotante))];
      if (conta.perfil === 'INSTITUICAO') return repo.findSolicitantes(conta.id_instituicao);
      return repo.findAll();
    },

    // O adotante precisa existir; senão, NotFoundError (404).
    findById: async (id: number) => encontrado(await repo.findById(id)),

    // Mesma regra da listagem, para um registro: 404 se não existe, 403 se não pode ver.
    buscar: async (conta: Conta, id: number) => {
      const adotante = await service.findById(id);
      if (conta.perfil === 'ADOTANTE') exigir(conta.id_adotante === id, 'Somente o próprio adotante pode acessar este cadastro.', 403);
      if (conta.perfil === 'INSTITUICAO') exigir(await repo.isSolicitante(id, conta.id_instituicao), 'O adotante não possui pedidos para os animais desta instituição.', 403);
      return adotante;
    },

    // RN02: o CPF não pode se repetir. O índice único do banco é a rede de segurança
    // para cadastros simultâneos (o repository traduz o erro 23505 em 409).
    create: async (data: CreateAdotanteDTO) => {
      if (await repo.findByCpf(data.cpf)) throw new ConflictError('CPF já cadastrado');
      return repo.create(data);
    },

    // Somente o próprio adotante (ou o administrador) altera o cadastro.
    update: async (conta: Conta, id: number, data: UpdateAdotanteDTO) => {
      const atual = await service.findById(id);
      exigir(conta.perfil === 'ADMIN' || conta.id_adotante === id, 'Somente o próprio adotante pode alterar este cadastro.', 403);
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

    // Somente o administrador (rota). Adotantes com matches ou conta vinculada são protegidos pelo banco (409).
    delete: async (id: number) => {
      await service.findById(id);
      return encontrado(await repo.delete(id));
    },
  };
  return service;
}
