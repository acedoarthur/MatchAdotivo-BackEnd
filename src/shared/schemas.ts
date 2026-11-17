import 'temporal-polyfill/global';
import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import type { Varchar } from '@prisma/orm-postgres/target/codec-types';

// Mensagens padrão do Zod em português; as regras do domínio têm mensagens próprias.
z.config(z.locales.pt());
// Adiciona .openapi() aos schemas: a mesma definição valida e documenta a API.
extendZodWithOpenApi(z);

const MAXIMO_INT4 = 2147483647;

// Mensagem do tipo básico: distingue campo ausente de campo com tipo errado.
function erroDeTipo(campo: string, esperado: string, feminino = false) {
  return (issue: { input?: unknown }) => issue.input === undefined
    ? `${campo} é ${feminino ? 'obrigatória' : 'obrigatório'}.`
    : `${campo} deve ser ${esperado}.`;
}

// O Prisma 8 marca VARCHAR com seu tamanho no tipo; a conversão sucede a validação.
function comoVarchar<N extends number>(valor: string) {
  return valor as Varchar<N>;
}

/** Texto aparado, entre `minimo` e `limite` caracteres. Retorna o schema ainda como string. */
export function textoBase(campo: string, limite: number, minimo = 1) {
  return z.string({ error: erroDeTipo(campo, 'um texto') })
    .trim()
    .min(minimo, minimo === 1 ? `${campo} não pode ser vazio.` : `${campo} deve ter no mínimo ${minimo} caracteres.`)
    .max(limite, `${campo} deve ter no máximo ${limite} caracteres.`);
}

/** Texto aparado, tipado como VARCHAR(limite) para o Prisma 8. */
export function varchar<N extends number>(campo: string, limite: N, minimo = 1) {
  return textoBase(campo, limite, minimo).transform((valor) => comoVarchar<N>(valor));
}

/** Número inteiro positivo no intervalo do INT do PostgreSQL (chaves e referências). */
export function idSchema(campo: string) {
  return z.number({ error: erroDeTipo(campo, 'um número inteiro') })
    .int(`${campo} deve ser um número inteiro.`)
    .min(1, `${campo} deve ser maior que zero.`)
    .max(MAXIMO_INT4, `${campo} deve ser no máximo ${MAXIMO_INT4}.`);
}

/** CPF/CNPJ: aceita pontuação, normaliza e exige somente os dígitos. */
export function documento<N extends number>(campo: string, tamanho: N) {
  return z.string({ error: erroDeTipo(campo, 'um texto') })
    .transform((valor) => valor.replace(/[.\-/\s]/g, ''))
    .pipe(z.string().regex(new RegExp(`^\\d{${tamanho}}$`), `${campo} deve conter ${tamanho} dígitos.`))
    .transform((valor) => comoVarchar<N>(valor));
}

/** Valor de uma lista fixa, sem diferenciar maiúsculas de minúsculas. */
export function escolha<const V extends readonly [string, ...string[]], N extends number>(campo: string, valores: V, limite: N) {
  return z.string({ error: erroDeTipo(campo, 'um texto') })
    .trim()
    .toUpperCase()
    .pipe(z.enum(valores, { error: `${campo} deve ser um de: ${valores.join(', ')}.` }))
    .transform((valor) => comoVarchar<N>(valor));
}

/** Data AAAA-MM-DD (coluna DATE), validada sem conversão de fuso. */
export function dataISO(campo: string) {
  return z.iso.date({ error: (issue) => issue.input === undefined
    ? `${campo} é obrigatória.`
    : `${campo} deve ser uma data válida no formato AAAA-MM-DD.` })
    .refine((valor) => !valor.startsWith('0000'), `${campo} deve ser uma data válida no formato AAAA-MM-DD.`);
}

/** Idade completa em anos; usa UTC porque "AAAA-MM-DD" é lido como meia-noite UTC. */
export function idadeEmAnos(nascimento: Date, hoje = new Date()): number {
  let idade = hoje.getUTCFullYear() - nascimento.getUTCFullYear();
  const meses = hoje.getUTCMonth() - nascimento.getUTCMonth();
  const dias = hoje.getUTCDate() - nascimento.getUTCDate();
  // Ainda não fez aniversário neste ano.
  if (meses < 0 || (meses === 0 && dias < 0)) idade--;
  return idade;
}

const erroDeObjeto = (issue: { code: string }) => issue.code === 'invalid_type' ? 'Envie um objeto JSON.' : undefined;

/** Corpo de cadastro: campos desconhecidos (como ids gerados pelo banco) são descartados. */
export function cadastro<S extends z.ZodRawShape>(shape: S) {
  return z.object(shape, { error: erroDeObjeto });
}

/**
 * Corpo de atualização parcial: todos os campos são opcionais, ao menos um é obrigatório
 * e campos fora da lista são rejeitados.
 */
export function atualizacao<S extends z.ZodRawShape>(shape: S) {
  const permitidos = Object.keys(shape).join(', ');
  return z.strictObject(shape, {
    error: (issue) => issue.code === 'unrecognized_keys'
      ? `Campos não permitidos: ${issue.keys.join(', ')}. Campos permitidos: ${permitidos}.`
      : erroDeObjeto(issue),
  }).partial().refine((dados) => Object.keys(dados).length > 0, {
    message: 'Informe ao menos um campo para atualizar.',
  });
}

/** Parâmetro :id da URL: inteiro positivo (sem sinal, zeros à esquerda, decimais ou notação científica). */
export const idParamsSchema = z.object({
  id: z.string({ error: 'O id é obrigatório.' })
    .regex(/^[1-9]\d*$/, 'O id deve ser um número inteiro maior que zero.')
    .transform(Number)
    .pipe(z.number().max(MAXIMO_INT4, `O id deve ser no máximo ${MAXIMO_INT4}.`))
    .openapi({ type: 'integer', example: 1, description: 'Identificador do registro', param: { name: 'id', in: 'path' } }),
}).openapi('IdParams');
