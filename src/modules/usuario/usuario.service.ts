import bcrypt from 'bcrypt';
import type { Database } from '../../prisma/db';
import { blacklistToken, generateToken } from '../../config/jwt';
import { ConflictError, UnauthorizedError } from '../../shared/errors';
import { usuarioRepository } from './usuario.repo';
import type { Varchar } from '@prisma/orm-postgres/target/codec-types';
import type { CreateUsuarioDTO, LoginDTO } from './usuario.types';

// Custo do bcrypt: quanto maior, mais lento (e mais difícil de quebrar)
const SALT_ROUNDS = 10;
// Hash de uma senha qualquer: o login compara contra ele quando o e-mail não existe, para que
// e-mail inexistente e senha errada demorem o mesmo tempo e a API não revele quais e-mails existem.
const HASH_FALSO = bcrypt.hashSync('senha-que-nao-pertence-a-ninguem', SALT_ROUNDS);

export function usuarioService(db: Database) {
  const repo = usuarioRepository(db);
  return {
    getAll: () => repo.findAll(),

    create: async (data: CreateUsuarioDTO) => {
      if (await repo.existsByEmail(data.email)) throw new ConflictError('E-mail já cadastrado');
      // A senha é criptografada antes de chegar ao banco; a original nunca é guardada.
      const senha = await bcrypt.hash(data.senha, SALT_ROUNDS) as Varchar<100>;
      return repo.create({ ...data, senha });
    },

    login: async ({ email, senha }: LoginDTO) => {
      const usuario = await repo.findByEmailComSenha(email);
      const confere = await bcrypt.compare(senha, usuario?.senha ?? HASH_FALSO);
      // Mesma mensagem para e-mail inexistente e senha errada.
      if (!usuario || !confere) throw new UnauthorizedError('Credenciais inválidas');
      return { token: generateToken(usuario.id_usuario) };
    },

    logout: (token: string) => { blacklistToken(token); },
  };
}
