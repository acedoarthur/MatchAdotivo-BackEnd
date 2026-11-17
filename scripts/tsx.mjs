import { createRequire } from 'node:module';
import { access, copyFile, chmod, mkdtemp, rm } from 'node:fs/promises';
import { constants } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const env = { ...process.env };
let pastaTemporaria;

// FAT32 com showexec não executa o esbuild, mesmo após chmod.
// Usa a mesma versão instalada pelo npm, copiando-a apenas se for necessário.
if (!env.ESBUILD_BINARY_PATH && process.platform !== 'win32') {
  const binario = require.resolve(`@esbuild/${process.platform}-${process.arch}/bin/esbuild`);
  try {
    await access(binario, constants.X_OK);
  } catch {
    pastaTemporaria = await mkdtemp(join(tmpdir(), 'match-adotivo-esbuild-'));
    const copia = join(pastaTemporaria, 'esbuild');
    await copyFile(binario, copia);
    await chmod(copia, 0o700);
    env.ESBUILD_BINARY_PATH = copia;
  }
}

const argumentos = process.argv.slice(2);
// Somente watch precisa do CLI; start e testes usam o loader sem servidor IPC.
const comando = argumentos[0] === 'watch'
  ? [require.resolve('tsx/cli'), ...argumentos]
  : ['--import', pathToFileURL(require.resolve('tsx')).href, ...argumentos];
const filho = spawn(process.execPath, comando, { stdio: 'inherit', env });
for (const sinal of ['SIGINT', 'SIGTERM']) {
  process.once(sinal, () => filho.kill(sinal));
}
filho.once('error', (erro) => { console.error(erro.message); });
const codigo = await new Promise((resolve) => {
  filho.once('error', () => resolve(1));
  filho.once('exit', (code) => resolve(code ?? 1));
});
if (pastaTemporaria) await rm(pastaTemporaria, { recursive: true, force: true });
process.exitCode = codigo;
