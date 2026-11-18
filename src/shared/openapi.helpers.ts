import { z } from 'zod';
import type { OpenAPIRegistry, RouteConfig } from '@asteasolutions/zod-to-openapi';
import { errorSchema, validationErrorSchema } from './error.schema';
import { idParamsSchema } from './schemas';

export const json = (schema: z.ZodType) => ({ 'application/json': { schema } });

// Respostas que se repetem em várias rotas, com o formato real devolvido pela API.
// 400 sem corpo (id ou parâmetro inválido): sempre no formato de validação, com details.
export const erro400 = { description: 'Dados inválidos (id ou parâmetro)', content: json(validationErrorSchema) };
// 400 com corpo: validação (com details) ou JSON malformado (somente error).
export const erro400Corpo = {
  description: 'Dados inválidos (ValidationErrorResponse) ou JSON malformado (ErrorResponse)',
  content: json(z.union([validationErrorSchema, errorSchema])),
};
export const erro413 = { description: 'Corpo maior que 100 KB', content: json(errorSchema) };
// Rotas protegidas: o token é exigido pelo middleware autenticar (cadeado no Swagger).
export const seguranca = [{ bearerAuth: [] }];
export const erro401 = { description: 'Token ausente, inválido, expirado ou invalidado pelo logout', content: json(errorSchema) };
export const erro500 = { description: 'Erro interno do servidor', content: json(errorSchema) };
export const erro = (description: string) => ({ description, content: json(errorSchema) });

/** Registra uma rota que exige o token: acrescenta o cadeado (security) e a resposta 401. */
export function protegida(registry: OpenAPIRegistry, rota: RouteConfig) {
  registry.registerPath({ ...rota, security: seguranca, responses: { ...rota.responses, 401: erro401 } });
}

interface ConfigCrud {
  tag: string;
  caminho: string;
  nome: string; // singular, para os resumos: "instituição"
  createSchema: z.ZodType;
  updateSchema: z.ZodType;
  responseSchema: z.ZodType;
  /** Erros possíveis nas rotas de escrita (POST e PUT), além da validação. */
  escrita?: { 404?: string; 409?: string };
  /** Motivo do 409 ao excluir, quando há registros dependentes. */
  conflitoExclusao?: string;
}

/** Registra as cinco rotas padrão do CRUD de uma entidade. */
export function registrarCrud(registry: OpenAPIRegistry, c: ConfigCrud) {
  const tags = [c.tag];
  const naoEncontrado = erro('Registro não encontrado');
  const { escrita = {} } = c;

  protegida(registry, {
    method: 'get', path: c.caminho, tags, summary: `Listar ${c.nome}`,
    description: 'Retorna todos os registros, ordenados pelo id',
    responses: { 200: { description: 'Lista', content: json(z.array(c.responseSchema)) }, 500: erro500 },
  });
  protegida(registry, {
    method: 'get', path: `${c.caminho}/{id}`, tags, summary: `Buscar ${c.nome} por id`,
    request: { params: idParamsSchema },
    responses: { 200: { description: 'Registro encontrado', content: json(c.responseSchema) }, 400: erro400, 404: naoEncontrado, 500: erro500 },
  });
  protegida(registry, {
    method: 'post', path: c.caminho, tags, summary: `Cadastrar ${c.nome}`,
    request: { body: { description: 'Dados do cadastro', required: true, content: json(c.createSchema) } },
    responses: {
      201: { description: 'Cadastrado; o cabeçalho Location aponta para o registro', content: json(c.responseSchema) },
      400: erro400Corpo,
      ...(escrita[404] && { 404: erro(escrita[404]) }),
      ...(escrita[409] && { 409: erro(escrita[409]) }),
      413: erro413,
      500: erro500,
    },
  });
  protegida(registry, {
    method: 'put', path: `${c.caminho}/{id}`, tags, summary: `Atualizar ${c.nome}`,
    description: 'Atualiza parcialmente: envie apenas os campos que deseja alterar',
    request: { params: idParamsSchema, body: { description: 'Campos a atualizar', required: true, content: json(c.updateSchema) } },
    responses: {
      200: { description: 'Atualizado', content: json(c.responseSchema) },
      400: erro400Corpo,
      404: erro(escrita[404] ?? 'Registro não encontrado'),
      ...(escrita[409] && { 409: erro(escrita[409]) }),
      413: erro413,
      500: erro500,
    },
  });
  protegida(registry, {
    method: 'delete', path: `${c.caminho}/{id}`, tags, summary: `Excluir ${c.nome}`,
    request: { params: idParamsSchema },
    responses: {
      204: { description: 'Excluído (sem conteúdo)' },
      400: erro400,
      404: naoEncontrado,
      ...(c.conflitoExclusao && { 409: erro(c.conflitoExclusao) }),
      500: erro500,
    },
  });
}
