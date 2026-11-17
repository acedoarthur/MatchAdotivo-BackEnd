import { z } from 'zod';
import { cadastro, atualizacao, varchar } from '../../shared/schemas';

const campos = { nome: varchar('nome', 150).openapi({ example: 'Antirrábica' }) };

export const createVacinaSchema = cadastro(campos).openapi('CreateVacinaInput');
export const updateVacinaSchema = atualizacao(campos).openapi('UpdateVacinaInput', {
  description: 'Envie apenas os campos que deseja alterar (ao menos um)',
});

export const vacinaResponseSchema = z.object({
  id_vacina: z.number().int().positive().openapi({ example: 1 }),
  nome: z.string().openapi({ example: 'Antirrábica' }),
}).openapi('Vacina');
