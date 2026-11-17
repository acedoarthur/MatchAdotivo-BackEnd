import type { z } from 'zod';
import type { createAdotanteSchema, updateAdotanteSchema } from './adotante.schema';

// data_nascimento chega ao serviço como Temporal.Instant, o tipo que o Prisma 8 grava.
export type CreateAdotanteDTO = z.infer<typeof createAdotanteSchema>;
export type UpdateAdotanteDTO = z.infer<typeof updateAdotanteSchema>;
