import type { z } from 'zod';
import type { Varchar } from '@prisma/orm-postgres/target/codec-types';
import type { createMatchSchema, solicitarMatchSchema, updateMatchSchema } from './match.schema';

export const STATUS_MATCH = ['PENDENTE', 'EM ANDAMENTO', 'APROVADO', 'CANCELADO'] as const;
export const EM_ANDAMENTO = 'EM ANDAMENTO' as Varchar<20>;
export const APROVADO = 'APROVADO' as Varchar<20>;

export type CreateMatchDTO = z.infer<typeof createMatchSchema>;
export type SolicitarMatchDTO = z.infer<typeof solicitarMatchSchema>;
/** Pedidos visíveis: os do adotante, os dos animais da instituição ou todos (vazio). */
export type EscopoMatch = { id_adotante: number } | { id_instituicao: number } | Record<string, never>;
export type UpdateMatchDTO = z.infer<typeof updateMatchSchema>;
