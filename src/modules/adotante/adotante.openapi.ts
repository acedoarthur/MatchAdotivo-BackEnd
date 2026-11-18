import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { registrarCrud } from '../../shared/openapi.helpers';
import { adotanteResponseSchema, createAdotanteSchema, updateAdotanteSchema } from './adotante.schema';

export function registerAdotantePaths(registry: OpenAPIRegistry) {
  registrarCrud(registry, {
    tag: 'Adotantes', caminho: '/adotantes', nome: 'adotante',
    createSchema: createAdotanteSchema, updateSchema: updateAdotanteSchema, responseSchema: adotanteResponseSchema,
    escrita: { 409: 'CPF já cadastrado ou utilizado por outro adotante' },
    conflitoExclusao: 'O adotante possui matches vinculados',
  });
}
