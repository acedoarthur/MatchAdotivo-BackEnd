import { z } from 'zod';
import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { erro, erro500, json } from './openapi.helpers';

export function registerBasicasPaths(registry: OpenAPIRegistry) {
  const tags = ['Básicas'];
  const texto = (description: string, example: string) => ({ description, content: { 'text/plain': { schema: z.string().openapi({ example }) } } });
  registry.registerPath({ method: 'get', path: '/', tags, summary: 'Boas-vindas', responses: { 200: texto('Mensagem de boas-vindas', 'Bem-vindo ao Laboratório de Rotas de DAW-II — Match de Adoção!') } });
  registry.registerPath({
    method: 'get', path: '/sobre', tags, summary: 'Descrição do sistema',
    responses: { 200: { description: 'Nome, descrição e entidades', content: json(z.object({
      nome: z.string().openapi({ example: 'Match de Adoção' }),
      descricao: z.string(),
      entidades: z.array(z.string()).openapi({ example: ['Instituição', 'Animal', 'Vacina', 'Animal_Vacina', 'Adotante', 'Match'] }),
      armazenamento: z.string().openapi({ example: 'PostgreSQL' }),
      orm: z.string().openapi({ example: 'Prisma 8' }),
    })) } },
  });
  registry.registerPath({
    method: 'get', path: '/saudacao/{nome}', tags, summary: 'Saudação personalizada',
    request: { params: z.object({ nome: z.string().openapi({ example: 'Ana', param: { name: 'nome', in: 'path' } }) }) },
    responses: { 200: texto('Saudação', 'Olá, Ana!'), 400: erro('Nome vazio ou parâmetro com codificação inválida') },
  });
  const numero = (name: string, example: number) => z.string().openapi({ example: String(example), param: { name, in: 'path' }, description: 'Número válido; use ponto para decimais' });
  registry.registerPath({
    method: 'get', path: '/calculo/soma/{num1}/{num2}', tags, summary: 'Somar dois números',
    request: { params: z.object({ num1: numero('num1', 10), num2: numero('num2', 5) }) },
    responses: { 200: { description: 'Resultado da soma', content: json(z.object({
      num1: z.number().openapi({ example: 10 }), num2: z.number().openapi({ example: 5 }), resultado: z.number().openapi({ example: 15 }),
    })) }, 400: erro('Números inválidos ou soma não finita'), 500: erro500 },
  });
}
