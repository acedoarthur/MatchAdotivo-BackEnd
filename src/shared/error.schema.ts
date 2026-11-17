import { z } from 'zod';
import './schemas'; // garante extendZodWithOpenApi(z) antes dos .openapi()

// Respostas de erro simples: id/JSON inválido, 404, 409, 413 e 500.
export const errorSchema = z.object({
  error: z.string().openapi({ example: 'Registro não encontrado.', description: 'Mensagem de erro' }),
}).openapi('ErrorResponse');

// Erros de validação (400) devolvidos pelo middleware validate: um item por campo com problema.
export const validationErrorSchema = z.object({
  error: z.string().openapi({ example: 'Dados inválidos' }),
  details: z.array(z.object({
    campo: z.string().openapi({ example: 'nome' }),
    mensagem: z.string().openapi({ example: 'nome deve ter no mínimo 3 caracteres.' }),
  })),
}).openapi('ValidationErrorResponse');
