import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { protegida, erro, erro400Corpo, erro413, erro500, json, registrarCrud } from '../../shared/openapi.helpers';
import { idParamsSchema } from '../../shared/schemas';
import { z } from 'zod';
import { createMatchSchema, matchResponseSchema, updateMatchSchema } from './match.schema';

export function registerMatchPaths(registry: OpenAPIRegistry) {
  protegida(registry, {
    method: 'get', path: '/matches/hoje', tags: ['Matches'], summary: 'Listar pedidos feitos hoje',
    description: 'Retorna os matches cujo pedido foi feito na data de hoje (horário de Brasília)',
    responses: { 200: { description: 'Lista de matches', content: json(z.array(matchResponseSchema)) }, 500: erro500 },
  });
  registrarCrud(registry, {
    tag: 'Matches', caminho: '/matches', nome: 'match',
    createSchema: createMatchSchema, updateSchema: updateMatchSchema, responseSchema: matchResponseSchema,
    escrita: { 404: 'Adotante, animal ou match inexistente', 409: 'O animal já possui uma adoção aprovada' },
  });
  protegida(registry, {
    method: 'patch', path: '/matches/{id}/status', tags: ['Matches'], summary: 'Alterar o status do match',
    description: 'Equivale ao PUT /matches/{id}. Só um match por animal pode estar APROVADO.',
    request: { params: idParamsSchema, body: { description: 'Novo status', required: true, content: json(updateMatchSchema) } },
    responses: {
      200: { description: 'Status atualizado', content: json(matchResponseSchema) },
      400: erro400Corpo,
      404: erro('Match não encontrado'),
      409: erro('O animal já possui outra adoção aprovada'),
      413: erro413,
      500: erro500,
    },
  });
}
