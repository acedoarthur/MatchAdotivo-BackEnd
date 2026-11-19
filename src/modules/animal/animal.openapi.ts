import { z } from 'zod';
import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { protegida, erro, erro400, erro500, json, registrarCrud } from '../../shared/openapi.helpers';
import { idParamsSchema } from '../../shared/schemas';
import { animalVacinaDetalhadaResponseSchema } from '../animal-vacina/animal-vacina.schema';
import { permissoesAnimal } from './animal.routes';
import { animalResponseSchema, createAnimalSchema, filtroTipoSchema, updateAnimalSchema } from './animal.schema';

export function registerAnimalPaths(registry: OpenAPIRegistry) {
  registrarCrud(registry, {
    tag: 'Animais', caminho: '/animais', nome: 'animal',
    createSchema: createAnimalSchema, updateSchema: updateAnimalSchema, responseSchema: animalResponseSchema,
    escrita: { 404: 'Instituição inexistente (ou animal inexistente, no PUT)' },
    conflitoExclusao: 'O animal possui vacinações ou matches vinculados',
    perfis: permissoesAnimal,
    regras: {
      getAll: 'Adotante: animais disponíveis (sem adoção aprovada). Instituição: os seus. Administrador: todos',
      getById: 'Adotante: animal disponível ou pedido por ele. Instituição: somente os seus (403)',
      create: 'A instituição cadastra para si mesma (id_instituicao omitido ou igual ao seu; outro → 403). O administrador informa id_instituicao (400 se ausente)',
      update: 'Somente animais da própria instituição; não é possível transferi-los para outra (403)',
      remove: 'Somente animais da própria instituição (403)',
    },
  });
  protegida(registry, {
    method: 'get', path: '/animais/tipo/{tipo}', tags: ['Animais'], summary: 'Filtrar animais por tipo',
    description: 'Não diferencia maiúsculas de minúsculas. Mesmo escopo da listagem de animais',
    request: { params: filtroTipoSchema },
    responses: { 200: { description: 'Animais do tipo informado', content: json(z.array(animalResponseSchema)) }, 400: erro400, 500: erro500 },
  }, permissoesAnimal.getAll);
  protegida(registry, {
    method: 'get', path: '/animais/{id}/vacinas', tags: ['Animais'], summary: 'Histórico de vacinação do animal',
    description: 'Cada aplicação é listada individualmente, inclusive doses repetidas. Mesma regra de acesso de GET /animais/{id}',
    request: { params: idParamsSchema },
    responses: { 200: { description: 'Aplicações com os dados da vacina', content: json(z.array(animalVacinaDetalhadaResponseSchema)) }, 400: erro400, 404: erro('Animal não encontrado'), 500: erro500 },
  }, permissoesAnimal.getById);
}
