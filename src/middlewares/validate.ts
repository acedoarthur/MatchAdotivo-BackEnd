import type { RequestHandler } from 'express';
import type { z } from 'zod';

type Segmento = 'body' | 'params' | 'query';

/**
 * Valida o corpo, os parâmetros da URL ou a query com o schema e troca o segmento pelos
 * dados já convertidos pelo Zod. Um ZodError é encaminhado ao tratador de erros, que
 * responde 400 no formato padrão.
 */
export const validate = (schema: z.ZodType, segmento: Segmento = 'body'): RequestHandler => (req, res, next) => {
  const dados = schema.parse(req[segmento]);
  // No Express 5, req.query é somente leitura; defineProperty vale para os três segmentos.
  Object.defineProperty(req, segmento, { value: dados, writable: true, enumerable: true, configurable: true });
  next();
};
