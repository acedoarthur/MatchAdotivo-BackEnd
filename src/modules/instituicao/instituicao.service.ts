import type { Database, Transaction } from '../../prisma/db';
import { ConflictError } from '../../shared/errors';
import { encontrado, exigir } from '../../shared/validacao';
import type { Conta } from '../usuario/usuario.types';
import { animalRepository } from '../animal/animal.repo';
import { usuarioRepository } from '../usuario/usuario.repo';
import { instituicaoRepository } from './instituicao.repo';
import type { CreateInstituicaoDTO, UpdateInstituicaoDTO } from './instituicao.types';

/*
Regras de negócio da instituição. O service não conhece o HTTP: recebe dados, aplica as
regras e devolve o resultado ou lança um erro da aplicação (404, 409...).
*/
export function instituicaoService(db: Database, tx?: Transaction) {
  const repo = instituicaoRepository(db, tx);
  const animais = animalRepository(db, tx);
  const usuarios = usuarioRepository(db, tx);
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

    // A instituição precisa existir; só ela mesma (ou o administrador) altera o cadastro.
    // O novo CNPJ não pode pertencer a outra.
    update: async (conta: Conta, id: number, data: UpdateInstituicaoDTO) => {
      await service.findById(id);
      exigir(conta.perfil === 'ADMIN' || conta.id_instituicao === id, 'Somente a própria instituição pode alterar este cadastro.', 403);
      if (data.cnpj) {
        const comCnpj = await repo.findByCnpj(data.cnpj);
        if (comCnpj && comCnpj.id_instituicao !== id) throw new ConflictError('CNPJ já utilizado por outra instituição');
      }
      return encontrado(await repo.update(id, data));
    },

    // Somente o administrador (rota). A restrição é preservada: nada é apagado em cascata. Antes de excluir,
    // explica o impedimento (409); as chaves estrangeiras do banco continuam como rede de segurança.
    delete: async (id: number) => {
      await service.findById(id);
      if (await animais.existsByInstituicao(id)) {
        throw new ConflictError('Não é possível excluir: a instituição possui animais cadastrados. Transfira os animais para outra instituição (editando cada animal) ou exclua-os antes — animais com vacinações ou pedidos de adoção precisam ter esses registros tratados primeiro.');
      }
      if (await usuarios.existsByInstituicao(id)) {
        throw new ConflictError('Não é possível excluir: existe uma conta de usuário vinculada a esta instituição. As contas não são apagadas automaticamente; a instituição só pode ser excluída depois que o vínculo for removido.');
      }
      return encontrado(await repo.delete(id));
    },
  };
  return service;
}
