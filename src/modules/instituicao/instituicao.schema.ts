import { z } from 'zod';
import { cadastro, atualizacao, documento, varchar } from '../../shared/schemas';

const campos = {
  cnpj: documento('cnpj', 14).openapi({ example: '12345678000199', description: 'CNPJ com 14 dígitos; pontuação é aceita e removida' }),
  razao_social: varchar('razao_social', 200).openapi({ example: 'Abrigo Patas Amigas' }),
  endereco: varchar('endereco', 255).openapi({ example: 'Rua das Flores, 100, Uberaba - MG' }),
  foto: varchar('foto', 500).nullish().openapi({ example: 'https://example.com/abrigo.jpg', description: 'URL ou caminho da foto (opcional)' }),
};

export const createInstituicaoSchema = cadastro(campos).openapi('CreateInstituicaoInput');
export const updateInstituicaoSchema = atualizacao(campos).openapi('UpdateInstituicaoInput', {
  description: 'Envie apenas os campos que deseja alterar (ao menos um)',
});

// Formato devolvido pela API; serve só para documentar as respostas.
export const instituicaoResponseSchema = z.object({
  id_instituicao: z.number().int().positive().openapi({ example: 1 }),
  cnpj: z.string().openapi({ example: '12345678000199' }),
  razao_social: z.string().openapi({ example: 'Abrigo Patas Amigas' }),
  endereco: z.string().openapi({ example: 'Rua das Flores, 100, Uberaba - MG' }),
  foto: z.string().nullable().openapi({ example: 'https://example.com/abrigo.jpg' }),
}).openapi('Instituicao');
