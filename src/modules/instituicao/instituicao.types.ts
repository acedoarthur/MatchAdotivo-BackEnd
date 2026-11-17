import type { z } from 'zod';
import type { createInstituicaoSchema, updateInstituicaoSchema } from './instituicao.schema';

// Os DTOs vêm dos schemas: validação e tipagem ficam unificadas.
export type CreateInstituicaoDTO = z.infer<typeof createInstituicaoSchema>;
export type UpdateInstituicaoDTO = z.infer<typeof updateInstituicaoSchema>;
