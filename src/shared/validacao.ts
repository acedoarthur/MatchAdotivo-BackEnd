import type { Request } from 'express';

export class ErroHttp extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function exigir(condicao: unknown, mensagem: string, status = 400): asserts condicao {
  if (!condicao) throw new ErroHttp(status, mensagem);
}

// O corpo e o :id são validados pelos schemas Zod (shared/schemas.ts) antes dos controllers.
// O middleware validate(idParamsSchema, 'params') já converteu o :id para número.
export function lerId(req: Request): number {
  const id: unknown = req.params.id;
  exigir(typeof id === 'number', 'Id inválido.');
  return id;
}

export function encontrado<T>(registro: T | null): T {
  exigir(registro !== null, 'Registro não encontrado.', 404);
  return registro;
}
