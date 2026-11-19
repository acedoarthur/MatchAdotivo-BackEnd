import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { protegida, erro, erro400Corpo, erro413, erro500, json, registrarCrud } from '../../shared/openapi.helpers';
import { idParamsSchema } from '../../shared/schemas';
import { z } from 'zod';
import { permissoesMatch } from './match.routes';
import { matchResponseSchema, solicitarMatchSchema, updateMatchSchema } from './match.schema';

const escopo = 'Adotante: os próprios pedidos. Instituição: pedidos dos seus animais. Administrador: todos';
const decisao = 'A instituição decide somente pedidos dos seus animais (403). Só um match por animal pode estar APROVADO';

export function registerMatchPaths(registry: OpenAPIRegistry) {
  protegida(registry, {
    method: 'get', path: '/matches/hoje', tags: ['Matches'], summary: 'Listar pedidos feitos hoje',
    description: `Retorna os matches cujo pedido foi feito na data de hoje (horário de Brasília). ${escopo}`,
    responses: { 200: { description: 'Lista de matches', content: json(z.array(matchResponseSchema)) }, 500: erro500 },
  }, permissoesMatch.getAll);
  registrarCrud(registry, {
    tag: 'Matches', caminho: '/matches', nome: 'match',
    createSchema: solicitarMatchSchema, updateSchema: updateMatchSchema, responseSchema: matchResponseSchema,
    escrita: { 404: 'Adotante, animal ou match inexistente', 409: 'O animal já possui uma adoção aprovada' },
    perfis: permissoesMatch,
    regras: {
      getAll: escopo,
      getById: `${escopo} (403 fora do escopo)`,
      create: 'O adotante logado é sempre o solicitante (id_adotante de outro → 403). O administrador informa id_adotante (400 se ausente)',
      update: decisao,
      remove: 'Somente pedidos dos animais da própria instituição (403)',
    },
  });
  protegida(registry, {
    method: 'patch', path: '/matches/{id}/status', tags: ['Matches'], summary: 'Aprovar, recusar ou alterar o status do match',
    description: `Equivale ao PUT /matches/{id}. Recusar = CANCELADO. ${decisao}.`,
    request: { params: idParamsSchema, body: { description: 'Novo status', required: true, content: json(updateMatchSchema) } },
    responses: {
      200: { description: 'Status atualizado', content: json(matchResponseSchema) },
      400: erro400Corpo,
      404: erro('Match não encontrado'),
      409: erro('O animal já possui outra adoção aprovada'),
      413: erro413,
      500: erro500,
    },
  }, permissoesMatch.update);
}
