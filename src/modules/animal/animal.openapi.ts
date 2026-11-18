import { z } from 'zod';
import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { protegida, erro, erro400, erro500, json, registrarCrud } from '../../shared/openapi.helpers';
import { idParamsSchema } from '../../shared/schemas';
import { animalVacinaDetalhadaResponseSchema } from '../animal-vacina/animal-vacina.schema';
import { animalResponseSchema, createAnimalSchema, filtroTipoSchema, updateAnimalSchema } from './animal.schema';

export function registerAnimalPaths(registry: OpenAPIRegistry) {
  registrarCrud(registry, {
    tag: 'Animais', caminho: '/animais', nome: 'animal',
    createSchema: createAnimalSchema, updateSchema: updateAnimalSchema, responseSchema: animalResponseSchema,
    escrita: { 404: 'Instituição inexistente (ou animal inexistente, no PUT)' },
    conflitoExclusao: 'O animal possui vacinações ou matches vinculados',
  });
  protegida(registry, {
    method: 'get', path: '/animais/tipo/{tipo}', tags: ['Animais'], summary: 'Filtrar animais por tipo',
    description: 'Não diferencia maiúsculas de minúsculas',
    request: { params: filtroTipoSchema },
    responses: { 200: { description: 'Animais do tipo informado', content: json(z.array(animalResponseSchema)) }, 400: erro400, 500: erro500 },
  });
  protegida(registry, {
    method: 'get', path: '/animais/{id}/vacinas', tags: ['Animais'], summary: 'Histórico de vacinação do animal',
    description: 'Cada aplicação é listada individualmente, inclusive doses repetidas',
    request: { params: idParamsSchema },
    responses: { 200: { description: 'Aplicações com os dados da vacina', content: json(z.array(animalVacinaDetalhadaResponseSchema)) }, 400: erro400, 404: erro('Animal não encontrado'), 500: erro500 },
  });
}
