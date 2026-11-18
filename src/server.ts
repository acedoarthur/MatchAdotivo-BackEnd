import 'dotenv/config';
import { criarConexao } from './prisma/db';
import { criarApp } from './app';
import { instituicaoRepository } from './modules/instituicao/instituicao.repo';

const port = Number(process.env.PORT ?? 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT deve estar entre 1 e 65535.');

const db = criarConexao();
// Falha antes de abrir a porta se o banco ou as tabelas ainda não estiverem prontos.
await instituicaoRepository(db).findAll();
const server = criarApp(db).listen(port, () => {
  console.log(`Match de Adoção — Prisma 8 em http://localhost:${port}`);
  console.log(`Documentação (Swagger) em http://localhost:${port}/docs`);
});
server.on('error', async (erro) => {
  console.error(`Não foi possível iniciar: ${erro.message}`);
  await db.close();
  process.exitCode = 1;
});

for (const sinal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(sinal, () => {
    server.close(async () => { await db.close(); });
  });
}
