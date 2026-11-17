import type { z } from 'zod';
import type { Varchar } from '@prisma/orm-postgres/target/codec-types';
import type { createMatchSchema, updateMatchSchema } from './match.schema';

export const STATUS_MATCH = ['PENDENTE', 'EM ANDAMENTO', 'APROVADO', 'CANCELADO'] as const;
export const EM_ANDAMENTO = 'EM ANDAMENTO' as Varchar<20>;
export const APROVADO = 'APROVADO' as Varchar<20>;

export type CreateMatchDTO = z.infer<typeof createMatchSchema>;
export type UpdateMatchDTO = z.infer<typeof updateMatchSchema>;
