import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

function arquivos(pasta: string): string[] {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome);
    return statSync(caminho).isDirectory() ? arquivos(caminho) : [caminho];
  });
}

const raiz = join(import.meta.dirname, '..', 'src');
const ts = arquivos(raiz).filter((f) => f.endsWith('.ts'));
const rel = (f: string) => relative(raiz, f).replaceAll('\\', '/');
// O único lugar fora de src/prisma que pode falar com o ORM é a camada de repositories.
const permitidos = (f: string) => rel(f).startsWith('prisma/') || rel(f).endsWith('.repo.ts') || rel(f) === 'shared/repository.ts';

test('só os repositories acessam o Prisma (db.orm, db.raw, transaction, query)', () => {
  const acessoAoBanco = /\.orm\.|\.raw\.|\.transaction\(|\btx\.query\(|@prisma\/orm-postgres\/runtime/;
  const violacoes = ts.filter((f) => !permitidos(f) && acessoAoBanco.test(readFileSync(f, 'utf8'))).map(rel);
  assert.deepEqual(violacoes, []);
});

test('controllers, rotas e serviços não conhecem códigos SQL do PostgreSQL', () => {
  const violacoes = ts.filter((f) => !permitidos(f) && /sqlState/.test(readFileSync(f, 'utf8'))).map(rel);
  assert.deepEqual(violacoes, []);
});

test('cada entidade tem o seu repository junto dos demais arquivos do módulo', () => {
  for (const modulo of ['instituicao', 'animal', 'vacina', 'animal-vacina', 'adotante', 'match', 'usuario']) {
    assert.ok(ts.some((f) => rel(f) === `modules/${modulo}/${modulo}.repo.ts`), modulo);
  }
});

test('controllers e rotas só falam com os services: sem repositories, sem regras de existência', () => {
  const camadaHttp = ts.filter((f) => rel(f).startsWith('modules/') && /\.(controller|routes)\.ts$/.test(f));
  assert.equal(camadaHttp.length, 14);
  const violacoes = camadaHttp.filter((f) => /\.repo['"]|shared\/repository|\bencontrado\b|\bexigir\b/.test(readFileSync(f, 'utf8'))).map(rel);
  assert.deepEqual(violacoes, []);
});

test('services não conhecem HTTP (req, res, express) e cada entidade tem o seu service', () => {
  const services = ts.filter((f) => /\.service\.ts$/.test(f) && !f.endsWith('adocao.service.ts'));
  assert.equal(services.length, 7);
  const violacoes = services.filter((f) => /from 'express'|\breq\b|\bres\b/.test(readFileSync(f, 'utf8'))).map(rel);
  assert.deepEqual(violacoes, []);
});

test('apenas shared/errors define erros com status HTTP (AppError)', () => {
  const definem = ts.filter((f) => /extends (AppError|ConflictError|NotFoundError|BadRequestError)/.test(readFileSync(f, 'utf8'))).map(rel);
  assert.deepEqual(definem.sort(), ['shared/errors.ts', 'shared/repository.ts']);
});
