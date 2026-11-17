import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { registrarCrud } from '../../shared/openapi.helpers';
import { animalVacinaResponseSchema, createAnimalVacinaSchema, updateAnimalVacinaSchema } from './animal-vacina.schema';

export function registerAnimalVacinaPaths(registry: OpenAPIRegistry) {
  registrarCrud(registry, {
    tag: 'Animal_Vacina', caminho: '/animais-vacinas', nome: 'aplicação de vacina',
    createSchema: createAnimalVacinaSchema, updateSchema: updateAnimalVacinaSchema, responseSchema: animalVacinaResponseSchema,
    escrita: { 404: 'Animal, vacina ou registro inexistente' },
  });
}
