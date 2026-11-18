import type { Request } from 'express';
import { AppError, NotFoundError } from './errors';

// Condição de entrada: falha com um erro da aplicação (400 por padrão).
export function exigir(condicao: unknown, mensagem: string, status = 400): asserts condicao {
  if (!condicao) throw new AppError(mensagem, status);
}

// O corpo e o :id são validados pelos schemas Zod (shared/schemas.ts) antes dos controllers.
// O middleware validate(idParamsSchema, 'params') já converteu o :id para número.
export function lerId(req: Request): number {
  const id: unknown = req.params.id;
  exigir(typeof id === 'number', 'Id inválido.');
  return id;
}

// Regra "o registro precisa existir": lança NotFoundError (404) quando o repository devolve null.
export function encontrado<T>(registro: T | null): T {
  if (registro === null) throw new NotFoundError();
  return registro;
}
