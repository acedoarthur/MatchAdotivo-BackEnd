import type { Database, Transaction } from '../prisma/db';
import { BadRequestError, ConflictError } from './errors';

/*
Erros próprios da aplicação: controllers e o tratador de erros não precisam conhecer
os códigos SQL (sqlState) do PostgreSQL. Os repositories fazem a tradução.
*/
export class RegistroDuplicadoError extends ConflictError {
  constructor() { super('CPF/CNPJ já cadastrado ou animal com outra adoção aprovada.'); }
}
export class ReferenciaInvalidaError extends ConflictError {
  constructor() { super('Referência inexistente ou registro vinculado a outros dados.'); }
}
export class DadosInvalidosError extends BadRequestError {
  constructor() { super('Os dados violam as restrições do cadastro.'); }
}

function traduzirErroBanco(erro: unknown): never {
  const sqlState = (erro as { sqlState?: string }).sqlState;
  if (sqlState === '23505') throw new RegistroDuplicadoError();
  if (sqlState === '23503' || sqlState === '23001') throw new ReferenciaInvalidaError();
  if (sqlState === '23514' || sqlState === '22001' || sqlState === '22007' || sqlState === '22008') throw new DadosInvalidosError();
  throw erro;
}

/** Executa uma escrita no banco traduzindo violações de restrição em erros da aplicação. */
export async function escrever<T>(operacao: () => Promise<T>): Promise<T> {
  try {
    return await operacao();
  } catch (erro) {
    return traduzirErroBanco(erro);
  }
}

/** Conexão normal ou transação aberta: os repositories funcionam com as duas. */
export const executor = (db: Database, tx?: Transaction) => (tx ?? db).orm.public;

/** Agrupa várias operações em uma transação; os repositories recebem o `tx` recebido aqui. */
export function emTransacao<T>(db: Database, operacao: (tx: Transaction) => Promise<T>): Promise<T> {
  return db.transaction(operacao);
}
