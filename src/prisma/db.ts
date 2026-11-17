import 'temporal-polyfill/global';
import 'dotenv/config';
import postgres from '@prisma/orm-postgres/runtime';
import type { Contract } from './contract.d';
import contractJson from './contract.json' with { type: 'json' };

export function criarConexao(url = process.env.DATABASE_URL) {
  if (!url) throw new Error('Defina DATABASE_URL no arquivo .env. Consulte .env.example.');
  return postgres<Contract>({ contractJson, url });
}

export type Database = ReturnType<typeof criarConexao>;
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
