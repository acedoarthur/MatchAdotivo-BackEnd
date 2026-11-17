import type { z } from 'zod';
import type { createAnimalVacinaSchema, updateAnimalVacinaSchema } from './animal-vacina.schema';

export type CreateAnimalVacinaDTO = z.infer<typeof createAnimalVacinaSchema>;
export type UpdateAnimalVacinaDTO = z.infer<typeof updateAnimalVacinaSchema>;
