import { z } from 'zod';
import type { Varchar } from '@prisma/orm-postgres/target/codec-types';
import { varchar } from '../../shared/schemas';

// E-mail sem espaços nem maiúsculas: "Maria@Email.com" e "maria@email.com" são o mesmo cadastro.
const email = z.string({ error: (i) => i.input === undefined ? 'email é obrigatório.' : 'email deve ser um texto.' })
  .trim().toLowerCase()
  .pipe(z.email('O email deve ser válido').max(255, 'email deve ter no máximo 255 caracteres.'))
  .transform((valor) => valor as Varchar<255>)
  .openapi({ example: 'maria@email.com' });

// O bcrypt só considera os 72 primeiros bytes da senha: senhas maiores seriam truncadas em silêncio.
const senhaCadastro = z.string({ error: (i) => i.input === undefined ? 'senha é obrigatória.' : 'senha deve ser um texto.' })
  .min(8, 'A senha deve ter pelo menos 8 caracteres')
  .refine((valor) => Buffer.byteLength(valor) <= 72, 'A senha deve ter no máximo 72 bytes')
  .openapi({ example: 'senhaSegura123', description: 'Mínimo de 8 caracteres' });

export const createUsuarioSchema = z.object({
  nome: varchar('nome', 200, 3).openapi({ example: 'Maria da Silva' }),
  email,
  senha: senhaCadastro,
}, { error: (i) => i.code === 'invalid_type' ? 'Envie um objeto JSON.' : undefined }).openapi('CreateUsuarioInput');

export const loginSchema = z.object({
  email,
  senha: z.string({ error: (i) => i.input === undefined ? 'senha é obrigatória.' : 'senha deve ser um texto.' })
    .min(1, 'Informe a senha').openapi({ example: 'senhaSegura123' }),
}, { error: (i) => i.code === 'invalid_type' ? 'Envie um objeto JSON.' : undefined }).openapi('LoginInput');

// Formato devolvido pela API: a senha NUNCA aparece na resposta.
export const usuarioResponseSchema = z.object({
  id_usuario: z.number().int().positive().openapi({ example: 1 }),
  nome: z.string().openapi({ example: 'Maria da Silva' }),
  email: z.email().openapi({ example: 'maria@email.com' }),
  created_at: z.iso.datetime().openapi({ example: '2026-10-21T15:00:00Z', description: 'Data e hora do cadastro (UTC)' }),
}).openapi('Usuario');

export const tokenResponseSchema = z.object({
  token: z.string().openapi({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', description: 'JWT válido por 1 hora' }),
}).openapi('TokenResponse');

export const logoutResponseSchema = z.object({
  message: z.string().openapi({ example: 'Logout realizado com sucesso' }),
}).openapi('LogoutResponse');
