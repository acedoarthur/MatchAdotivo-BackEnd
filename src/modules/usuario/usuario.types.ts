import type { z } from 'zod';
import type { Varchar } from '@prisma/orm-postgres/target/codec-types';
import type { createUsuarioSchema, loginSchema, perfilSchema } from './usuario.schema';

export const PERFIS = ['ADOTANTE', 'INSTITUICAO', 'ADMIN'] as const;
export type Perfil = typeof PERFIS[number];
// O cadastro público (e a conclusão do perfil de contas antigas) só oferece estes dois.
export const PERFIS_CADASTRO = ['ADOTANTE', 'INSTITUICAO'] as const;

export type CreateUsuarioDTO = z.infer<typeof createUsuarioSchema>;
export type PerfilDTO = z.infer<typeof perfilSchema>;
export type Vinculo =
  | { perfil: Varchar<20>; id_adotante: number }
  | { perfil: Varchar<20>; id_instituicao: number }
  | { perfil: Varchar<20> };
// O que o repository grava: a senha já criptografada (hash bcrypt de 60 caracteres) e o vínculo do perfil.
export type NovoUsuario = Pick<CreateUsuarioDTO, 'nome' | 'email'> & { senha: Varchar<100> } & Vinculo;
export type LoginDTO = z.infer<typeof loginSchema>;

/**
 * Identidade autenticada usada pelos services, lida do banco a cada requisição.
 * Contas anteriores aos perfis têm perfil null e nenhuma permissão nas rotas do sistema.
 */
export type Conta =
  | { id_usuario: number; perfil: 'ADOTANTE'; id_adotante: number; id_instituicao: null }
  | { id_usuario: number; perfil: 'INSTITUICAO'; id_adotante: null; id_instituicao: number }
  | { id_usuario: number; perfil: 'ADMIN' | null; id_adotante: null; id_instituicao: null };
