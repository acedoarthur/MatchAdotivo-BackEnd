import { z } from 'zod';
import { cadastro, atualizacao, documento, escolha, idadeEmAnos, varchar } from '../../shared/schemas';

export const TIPOS_RESIDENCIA = ['CASA', 'APARTAMENTO', 'CHÁCARA', 'OUTRO'] as const;
export const IDADE_MINIMA = 18;

// Recebe "AAAA-MM-DD" (lido como meia-noite UTC), exige maioridade e entrega o
// Temporal.Instant que o Prisma 8 usa nos campos DateTime.
export const dataNascimentoSchema = z.iso.date({
  error: (issue) => issue.input === undefined
    ? 'A data de nascimento é obrigatória'
    : 'Data inválida (use o formato AAAA-MM-DD)',
})
  .transform((texto) => new Date(texto))
  .refine((data) => idadeEmAnos(data) >= IDADE_MINIMA, { message: `O adotante deve ter pelo menos ${IDADE_MINIMA} anos` })
  .transform((data) => Temporal.Instant.fromEpochMilliseconds(data.getTime()))
  .openapi({ type: 'string', format: 'date', example: '1990-10-10', description: 'Data de nascimento (AAAA-MM-DD). O adotante deve ter pelo menos 18 anos.' });

const quantidadeSchema = z.number({ error: (issue) => issue.input === undefined ? 'quantidade_animais é obrigatório.' : 'quantidade_animais deve ser um número inteiro.' })
  .int('quantidade_animais deve ser um número inteiro.')
  .min(0, 'quantidade_animais não pode ser negativa.')
  .max(2147483647, 'quantidade_animais deve ser no máximo 2147483647.');

const possuiAnimaisSchema = z.boolean({ error: (issue) => issue.input === undefined ? 'possui_animais é obrigatório.' : 'possui_animais deve ser true ou false.' });

// RN06: zero animais quando não possui; ao menos um quando possui (também há CHECK no banco).
function exigirCoerencia(dados: { possui_animais: boolean; quantidade_animais: number }, ctx: z.RefinementCtx) {
  // Quantidade negativa ou fracionária já tem mensagem própria no campo.
  if (!Number.isInteger(dados.quantidade_animais) || dados.quantidade_animais < 0) return;
  if (dados.possui_animais ? dados.quantidade_animais <= 0 : dados.quantidade_animais !== 0) {
    ctx.addIssue({
      code: 'custom',
      path: ['quantidade_animais'],
      message: 'A quantidade de animais deve ser coerente com possui_animais (zero se não possui; maior que zero se possui).',
    });
  }
}

// Revalida o par depois de combinar a atualização parcial com os dados gravados.
export const coerenciaAnimaisSchema = z.object({
  possui_animais: possuiAnimaisSchema,
  quantidade_animais: quantidadeSchema,
}).superRefine(exigirCoerencia);

const campos = {
  cpf: documento('cpf', 11).openapi({ example: '12345678909', description: 'CPF com 11 dígitos; pontuação é aceita e removida' }),
  nome: varchar('nome', 200, 3).openapi({ example: 'Maria da Silva' }),
  endereco: varchar('endereco', 255).openapi({ example: 'Rua do Sol, 50, Uberaba - MG' }),
  tipo_residencia: escolha('tipo_residencia', TIPOS_RESIDENCIA, 30).openapi({ example: 'CASA', description: 'CASA, APARTAMENTO, CHÁCARA ou OUTRO' }),
  possui_animais: possuiAnimaisSchema.openapi({ example: true }),
  quantidade_animais: quantidadeSchema.openapi({ example: 2, description: 'Zero se não possui animais; maior que zero se possui' }),
  tipos_animais: varchar('tipos_animais', 65535).nullish().openapi({ example: 'cachorro, gato' }),
};

// A data é opcional no banco (adotantes antigos não a possuem), mas obrigatória no cadastro.
export const createAdotanteSchema = cadastro({ ...campos, data_nascimento: dataNascimentoSchema })
  .superRefine(exigirCoerencia)
  .openapi('CreateAdotanteInput');
export const updateAdotanteSchema = atualizacao({ ...campos, data_nascimento: dataNascimentoSchema }).openapi('UpdateAdotanteInput', {
  description: 'Envie apenas os campos que deseja alterar (ao menos um)',
});

export const adotanteResponseSchema = z.object({
  id_adotante: z.number().int().positive().openapi({ example: 1 }),
  cpf: z.string().openapi({ example: '12345678909' }),
  nome: z.string().openapi({ example: 'Maria da Silva' }),
  endereco: z.string().openapi({ example: 'Rua do Sol, 50, Uberaba - MG' }),
  tipo_residencia: z.string().openapi({ example: 'CASA' }),
  data_nascimento: z.iso.datetime().nullable().openapi({
    example: '1990-10-10T00:00:00Z',
    description: 'Data de nascimento em UTC. Adotantes cadastrados antes dessa coluna podem ter null.',
  }),
  possui_animais: z.boolean().openapi({ example: true }),
  quantidade_animais: z.number().int().min(0).openapi({ example: 2 }),
  tipos_animais: z.string().nullable().openapi({ example: 'cachorro, gato' }),
}).openapi('Adotante');
