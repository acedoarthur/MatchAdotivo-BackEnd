import { z } from 'zod';
import type { Varchar } from '@prisma/orm-postgres/target/codec-types';
import { varchar } from '../../shared/schemas';
import { createAdotanteSchema } from '../adotante/adotante.schema';
import { createInstituicaoSchema } from '../instituicao/instituicao.schema';
import { PERFIS, PERFIS_CADASTRO } from './usuario.types';

const erroDeObjeto = (i: { code: string }) => i.code === 'invalid_type' ? 'Envie um objeto JSON.' : undefined;

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

const mensagemPerfil = (perfis: readonly string[]) => `perfil deve ser um de: ${perfis.join(', ')}.`;

// Perfil escolhido no cadastro: o cadastro do adotante ou da instituição reaproveita os schemas dos módulos.
const perfilAdotante = { perfil: z.literal('ADOTANTE'), adotante: createAdotanteSchema };
const perfilInstituicao = { perfil: z.literal('INSTITUICAO'), instituicao: createInstituicaoSchema };
const opcoesPerfil = { error: (i: { code: string }) => i.code === 'invalid_union' ? mensagemPerfil(PERFIS_CADASTRO) : erroDeObjeto(i) };

// Conclusão do perfil de contas antigas (POST /usuarios/perfil). ADMIN nunca é aceito aqui.
export const perfilSchema = z.discriminatedUnion('perfil', [
  z.object(perfilAdotante, { error: erroDeObjeto }),
  z.object(perfilInstituicao, { error: erroDeObjeto }),
], opcoesPerfil).openapi('PerfilInput', {
  description: 'Envie perfil ADOTANTE com o objeto adotante, ou INSTITUICAO com o objeto instituicao.',
  example: { perfil: 'INSTITUICAO', instituicao: { cnpj: '12345678000199', razao_social: 'Abrigo Patas Amigas', endereco: 'Rua das Flores, 100' } },
});

const conta = {
  nome: varchar('nome', 200, 3).openapi({ example: 'Maria da Silva' }),
  email,
  senha: senhaCadastro,
};

// Cadastro público: somente ADOTANTE ou INSTITUICAO, sempre com o cadastro correspondente.
export const createUsuarioSchema = z.discriminatedUnion('perfil', [
  z.object({ ...conta, ...perfilAdotante }, { error: erroDeObjeto }),
  z.object({ ...conta, ...perfilInstituicao }, { error: erroDeObjeto }),
], opcoesPerfil).openapi('CreateUsuarioInput', {
  description: 'Dados de acesso e o perfil: ADOTANTE com o objeto adotante, ou INSTITUICAO com o objeto instituicao.',
  example: {
    nome: 'Maria da Silva', email: 'maria@email.com', senha: 'senhaSegura123', perfil: 'ADOTANTE',
    adotante: { cpf: '12345678909', nome: 'Maria da Silva', endereco: 'Rua do Sol, 50', tipo_residencia: 'CASA', data_nascimento: '1990-10-10', possui_animais: false, quantidade_animais: 0 },
  },
});

export const loginSchema = z.object({
  email,
  senha: z.string({ error: (i) => i.input === undefined ? 'senha é obrigatória.' : 'senha deve ser um texto.' })
    .min(1, 'Informe a senha').openapi({ example: 'senhaSegura123' }),
  perfil: z.enum(PERFIS, { error: mensagemPerfil(PERFIS) })
    .openapi({ example: 'ADOTANTE', description: 'Perfil escolhido na tela de entrar; precisa ser o perfil da conta e não concede permissões' }),
}, { error: erroDeObjeto }).openapi('LoginInput');

// Formato devolvido pela API: a senha NUNCA aparece na resposta.
export const usuarioResponseSchema = z.object({
  id_usuario: z.number().int().positive().openapi({ example: 1 }),
  nome: z.string().openapi({ example: 'Maria da Silva' }),
  email: z.email().openapi({ example: 'maria@email.com' }),
  created_at: z.iso.datetime().openapi({ example: '2026-10-21T15:00:00Z', description: 'Data e hora do cadastro (UTC)' }),
  perfil: z.enum(PERFIS).nullable().openapi({ example: 'ADOTANTE', description: 'null em contas antigas que ainda não concluíram o perfil' }),
  id_adotante: z.number().int().positive().nullable().openapi({ example: 1, description: 'Cadastro do adotante (perfil ADOTANTE)' }),
  id_instituicao: z.number().int().positive().nullable().openapi({ example: null, description: 'Cadastro da instituição (perfil INSTITUICAO)' }),
}).openapi('Usuario');

export const tokenResponseSchema = z.object({
  token: z.string().openapi({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', description: 'JWT válido por 1 hora' }),
  perfil: z.enum(PERFIS).nullable().openapi({ example: 'ADOTANTE', description: 'Perfil gravado na conta; null indica que o perfil precisa ser concluído' }),
}).openapi('TokenResponse');

export const logoutResponseSchema = z.object({
  message: z.string().openapi({ example: 'Logout realizado com sucesso' }),
}).openapi('LogoutResponse');
