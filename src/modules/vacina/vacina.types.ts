import type { z } from 'zod';
import type { createVacinaSchema, updateVacinaSchema } from './vacina.schema';

export type CreateVacinaDTO = z.infer<typeof createVacinaSchema>;
export type UpdateVacinaDTO = z.infer<typeof updateVacinaSchema>;
