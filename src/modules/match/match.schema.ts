import { z } from 'zod';
import { cadastro, atualizacao, escolha, idSchema } from '../../shared/schemas';
import { STATUS_MATCH } from './match.types';

// A solicitação nasce PENDENTE: o status, se enviado, só pode ser esse; a data é gerada pelo banco.
const statusInicial = z.literal('PENDENTE', { error: 'O status inicial deve ser PENDENTE.' }).optional()
  .openapi({ example: 'PENDENTE', description: 'Opcional: a solicitação sempre nasce PENDENTE' });
const id_animal = idSchema('id_animal').openapi({ example: 1 });

// Fluxo interno e comando de adoção: adotante e animal informados.
export const createMatchSchema = cadastro({
  id_adotante: idSchema('id_adotante'),
  id_animal,
  status: statusInicial,
}).transform(({ id_adotante, id_animal }) => ({ id_adotante, id_animal }));

// API: o adotante logado é o solicitante; somente o administrador informa id_adotante.
export const solicitarMatchSchema = cadastro({
  id_adotante: idSchema('id_adotante').optional().openapi({
    example: 1, description: 'Somente o administrador informa; o adotante logado pode omitir (é sempre ele mesmo)',
  }),
  id_animal,
  status: statusInicial,
}).transform(({ id_adotante, id_animal }) => ({ id_adotante, id_animal })).openapi('CreateMatchInput');

// Depois de criado, somente o status muda; adotante, animal e data identificam o pedido.
export const updateMatchSchema = atualizacao({
  status: escolha('status', STATUS_MATCH, 20).openapi({ example: 'EM ANDAMENTO', description: 'PENDENTE, EM ANDAMENTO, APROVADO ou CANCELADO' }),
}).openapi('UpdateMatchInput', { description: 'Somente o status pode ser alterado' });

export const matchResponseSchema = z.object({
  id_match: z.number().int().positive().openapi({ example: 1 }),
  id_adotante: z.number().int().positive().openapi({ example: 1 }),
  id_animal: z.number().int().positive().openapi({ example: 1 }),
  data_pedido: z.iso.datetime().openapi({ example: '2026-11-17T21:34:21.123Z', description: 'Gerada pelo banco na criação' }),
  status: z.enum(STATUS_MATCH).openapi({ example: 'PENDENTE' }),
}).openapi('Match');
