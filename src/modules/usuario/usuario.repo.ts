import type { Varchar } from '@prisma/orm-postgres/target/codec-types';
import type { Database, Transaction } from '../../prisma/db';
import { escrever, executor } from '../../shared/repository';
import type { NovoUsuario } from './usuario.types';

export function usuarioRepository(db: Database, tx?: Transaction) {
  const Usuarios = executor(db, tx).Usuario;
  // Consultas que vão para a resposta da API: sem o campo senha.
  const Publicos = Usuarios.select('id_usuario', 'nome', 'email', 'created_at');
  return {
    findAll: () => Publicos.orderBy((u) => u.id_usuario.asc()).all(),
    // Inclui a senha (criptografada): usado SOMENTE no login.
    findByEmailComSenha: (email: Varchar<255>) => Usuarios.where({ email }).first(),
    existsByEmail: async (email: Varchar<255>) => (await Usuarios.select('id_usuario').where({ email }).first()) !== null,
    // Recebe a senha já criptografada pelo service. O índice único é a rede de segurança (409).
    create: (data: NovoUsuario) => escrever(() => Publicos.create(data)),
  };
}
