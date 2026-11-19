import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { registrarCrud } from '../../shared/openapi.helpers';
import { permissoesAnimalVacina } from './animal-vacina.routes';
import { animalVacinaResponseSchema, createAnimalVacinaSchema, updateAnimalVacinaSchema } from './animal-vacina.schema';

export function registerAnimalVacinaPaths(registry: OpenAPIRegistry) {
  registrarCrud(registry, {
    tag: 'Animal_Vacina', caminho: '/animais-vacinas', nome: 'aplicação de vacina',
    createSchema: createAnimalVacinaSchema, updateSchema: updateAnimalVacinaSchema, responseSchema: animalVacinaResponseSchema,
    escrita: { 404: 'Animal, vacina ou registro inexistente' },
    perfis: permissoesAnimalVacina,
    regras: {
      getAll: 'A instituição vê somente as aplicações dos seus animais',
      getById: 'A instituição acessa somente aplicações dos seus animais (403)',
      create: 'A instituição registra doses somente nos seus animais (403)',
      update: 'Somente aplicações e animais da própria instituição (403)',
      remove: 'Somente aplicações dos animais da própria instituição (403)',
    },
  });
}
