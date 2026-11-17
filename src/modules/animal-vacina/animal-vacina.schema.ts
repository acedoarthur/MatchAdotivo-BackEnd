import { z } from 'zod';
import { cadastro, atualizacao, dataISO, idSchema } from '../../shared/schemas';
import { vacinaResponseSchema } from '../vacina/vacina.schema';

const campos = {
  id_animal: idSchema('id_animal').openapi({ example: 1 }),
  id_vacina: idSchema('id_vacina').openapi({ example: 1 }),
  data_aplicacao: dataISO('data_aplicacao').openapi({ example: '2026-05-10', description: 'Data da dose (AAAA-MM-DD)' }),
};

export const createAnimalVacinaSchema = cadastro(campos).openapi('CreateAnimalVacinaInput');
export const updateAnimalVacinaSchema = atualizacao(campos).openapi('UpdateAnimalVacinaInput', {
  description: 'Envie apenas os campos que deseja alterar (ao menos um)',
});

const respostaBase = {
  id_animal_vacina: z.number().int().positive().openapi({ example: 1 }),
  id_animal: z.number().int().positive().openapi({ example: 1 }),
  id_vacina: z.number().int().positive().openapi({ example: 1 }),
  data_aplicacao: z.iso.date().openapi({ example: '2026-05-10' }),
};
export const animalVacinaResponseSchema = z.object(respostaBase).openapi('AnimalVacina');
// Histórico de vacinação de um animal: cada dose traz os dados da vacina.
export const animalVacinaDetalhadaResponseSchema = z.object({ ...respostaBase, vacina: vacinaResponseSchema }).openapi('AnimalVacinaDetalhada');
