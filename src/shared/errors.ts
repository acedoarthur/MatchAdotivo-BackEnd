/*
Erros da aplicação: cada um já sabe qual status HTTP representa.
Os services (e os repositories, ao traduzir erros do banco) lançam;
o tratador de erros (shared/erros.ts) transforma em resposta JSON.
*/
export class AppError extends Error {
  constructor(message: string, public readonly statusCode: number) {
    super(message);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Requisição inválida') { super(message, 400); }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Não autorizado') { super(message, 401); }
}

export class NotFoundError extends AppError {
  constructor(message = 'Registro não encontrado.') { super(message, 404); }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflito com um registro existente') { super(message, 409); }
}
