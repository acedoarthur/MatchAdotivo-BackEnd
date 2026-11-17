import { z } from 'zod';
import type { Varchar } from '@prisma/orm-postgres/target/codec-types';
import { cadastro, atualizacao, dataISO, idSchema, textoBase, varchar } from '../../shared/schemas';

// O tipo (cachorro, gato, coelho...) é normalizado em minúsculas.
export const tipoAnimalSchema = textoBase('tipo', 50).toLowerCase().transform((valor) => valor as Varchar<50>);

const campos = {
  raca: varchar('raca', 100).nullish().openapi({ example: 'Sem raça definida' }),
  tipo: tipoAnimalSchema.openapi({ example: 'cachorro', description: 'Espécie (cachorro, gato, coelho...); gravada em minúsculas' }),
  data_nascimento: dataISO('data_nascimento').nullish().openapi({ example: '2024-05-10', description: 'AAAA-MM-DD (opcional)' }),
  detalhes: varchar('detalhes', 65535).nullish().openapi({ example: 'Dócil e brincalhão' }),
  foto: varchar('foto', 500).nullish().openapi({ example: 'https://example.com/animal.jpg' }),
  apelido: varchar('apelido', 100).nullish().openapi({ example: 'Bolinha', description: 'Apelido do animal (opcional)' }),
  id_instituicao: idSchema('id_instituicao').openapi({ example: 1, description: 'Instituição que abriga o animal (obrigatória)' }),
};

export const createAnimalSchema = cadastro(campos).openapi('CreateAnimalInput');
export const updateAnimalSchema = atualizacao(campos).openapi('UpdateAnimalInput', {
  description: 'Envie apenas os campos que deseja alterar (ao menos um)',
});
// Filtro GET /animais/tipo/:tipo
export const filtroTipoSchema = z.object({
  tipo: tipoAnimalSchema.openapi({ example: 'gato', param: { name: 'tipo', in: 'path' } }),
});

export const animalResponseSchema = z.object({
  id_animal: z.number().int().positive().openapi({ example: 1 }),
  raca: z.string().nullable().openapi({ example: 'Sem raça definida' }),
  tipo: z.string().openapi({ example: 'cachorro' }),
  data_nascimento: z.iso.date().nullable().openapi({ example: '2024-05-10' }),
  detalhes: z.string().nullable().openapi({ example: 'Dócil e brincalhão' }),
  foto: z.string().nullable().openapi({ example: 'https://example.com/animal.jpg' }),
  apelido: z.string().nullable().openapi({ example: 'Bolinha' }),
  id_instituicao: z.number().int().positive().openapi({ example: 1 }),
}).openapi('Animal');
