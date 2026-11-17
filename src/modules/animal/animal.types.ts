import type { z } from 'zod';
import type { createAnimalSchema, updateAnimalSchema } from './animal.schema';

export type CreateAnimalDTO = z.infer<typeof createAnimalSchema>;
export type UpdateAnimalDTO = z.infer<typeof updateAnimalSchema>;
