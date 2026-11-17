import { parseArgs } from 'node:util';
import { ZodError } from 'zod';
import { criarConexao, type Database } from '../prisma/db';
import { createMatchSchema } from '../modules/match/match.schema';
import { processarAdocao } from '../modules/match/adocao.service';

let db: Database | undefined;
try {
  const { values } = parseArgs({ options: {
    adotante: { type: 'string' },
    animal: { type: 'string' },
    erro: { type: 'boolean', default: false },
  } });
  // Mesmo schema da API: ids ausentes ou inválidos viram NaN e são rejeitados pelo Zod.
  const dados = createMatchSchema.parse({ id_adotante: Number(values.adotante), id_animal: Number(values.animal) });
  db = criarConexao();
  console.log('Iniciando processamento de adoção (etapas de 2, 3 e 4 segundos)...');
  const match = await processarAdocao(db, dados, { falharNaAnalise: values.erro });
  if (match === null) process.exitCode = 1;
} catch (erro) {
  if (erro instanceof ZodError) erro.issues.forEach((issue) => console.error(`${issue.path.join('.')}: ${issue.message}`));
  else console.error(erro instanceof Error ? erro.message : String(erro));
  console.error('Uso: npm run adocao -- --adotante 1 --animal 1 [--erro]');
  process.exitCode = 1;
} finally {
  await db?.close();
}
