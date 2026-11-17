import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { registrarCrud } from '../../shared/openapi.helpers';
import { createVacinaSchema, updateVacinaSchema, vacinaResponseSchema } from './vacina.schema';

export function registerVacinaPaths(registry: OpenAPIRegistry) {
  registrarCrud(registry, {
    tag: 'Vacinas', caminho: '/vacinas', nome: 'vacina',
    createSchema: createVacinaSchema, updateSchema: updateVacinaSchema, responseSchema: vacinaResponseSchema,
    conflitoExclusao: 'A vacina possui aplicações registradas',
  });
}
