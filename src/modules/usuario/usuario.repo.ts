import type { Varchar } from '@prisma/orm-postgres/target/codec-types';
import type { Database, Transaction } from '../../prisma/db';
import { escrever, executor } from '../../shared/repository';
import type { NovoUsuario, Vinculo } from './usuario.types';

export function usuarioRepository(db: Database, tx?: Transaction) {
  const Usuarios = executor(db, tx).Usuario;
  // Consultas que vão para a resposta da API: sem o campo senha.
  const Publicos = Usuarios.select('id_usuario', 'nome', 'email', 'created_at', 'perfil', 'id_adotante', 'id_instituicao');
  return {
    findAll: () => Publicos.orderBy((u) => u.id_usuario.asc()).all(),
    findById: (id_usuario: number) => Publicos.where({ id_usuario }).first(),
    findByEmail: (email: Varchar<255>) => Publicos.where({ email }).first(),
    existsByInstituicao: async (id_instituicao: number) => (await Usuarios.select('id_usuario').where({ id_instituicao }).first()) !== null,
    // Inclui a senha (criptografada): usado SOMENTE no login.
    findByEmailComSenha: (email: Varchar<255>) => Usuarios.where({ email }).first(),
    existsByEmail: async (email: Varchar<255>) => (await Usuarios.select('id_usuario').where({ email }).first()) !== null,
    // Recebe a senha já criptografada pelo service. O índice único é a rede de segurança (409).
    create: (data: NovoUsuario) => escrever(() => Publicos.create(data)),
    // O perfil só é definido com a linha bloqueada (bloquear), depois de conferir que a conta não tem perfil.
    definirPerfil: (id_usuario: number, vinculo: Vinculo) => escrever(() => Publicos.where({ id_usuario }).update(vinculo)),
    /**
     * Bloqueia a linha do usuário até o fim da transação (SELECT ... FOR UPDATE), serializando
     * definições de perfil concorrentes. Retorna o usuário ou null. Exige uma transação.
     */
    bloquear: async (id_usuario: number) => {
      if (!tx) throw new Error('bloquear exige uma transação aberta.');
      await tx.query(db.raw.sql`SELECT id_usuario FROM usuarios WHERE id_usuario = ${id_usuario} FOR UPDATE`
        .returnsRow({ id_usuario: 'pg/int4@1' }).build());
      return Publicos.where({ id_usuario }).first();
    },
  };
}
