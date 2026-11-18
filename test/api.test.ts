import 'dotenv/config';
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { Server } from 'node:http';
import { criarConexao, type Database } from '../src/prisma/db';
import { criarApp } from '../src/app';
import type { Varchar } from '@prisma/orm-postgres/target/codec-types';
import { APROVADO } from '../src/modules/match/match.types';
import { instituicaoResponseSchema } from '../src/modules/instituicao/instituicao.schema';
import { animalResponseSchema } from '../src/modules/animal/animal.schema';
import { vacinaResponseSchema } from '../src/modules/vacina/vacina.schema';
import { animalVacinaResponseSchema, animalVacinaDetalhadaResponseSchema } from '../src/modules/animal-vacina/animal-vacina.schema';
import { adotanteResponseSchema } from '../src/modules/adotante/adotante.schema';
import { matchResponseSchema } from '../src/modules/match/match.schema';
import { instituicaoRepository } from '../src/modules/instituicao/instituicao.repo';
import { animalRepository } from '../src/modules/animal/animal.repo';
import { adotanteRepository } from '../src/modules/adotante/adotante.repo';
import { matchRepository } from '../src/modules/match/match.repo';
import { emTransacao, RegistroDuplicadoError, ReferenciaInvalidaError, DadosInvalidosError } from '../src/shared/repository';
import jwt from 'jsonwebtoken';
import { usuarioResponseSchema } from '../src/modules/usuario/usuario.schema';
import { processarAdocao } from '../src/modules/match/adocao.service';

let db: Database;
let server: Server;
let url: string;
let instituicao: number;
let animal: number;
let adotante: number;
let vacina: number;

before(async () => {
  const connection = process.env.TEST_DATABASE_URL;
  assert.ok(connection, 'Configure TEST_DATABASE_URL antes de executar os testes.');
  assert.ok(new URL(connection).pathname.endsWith('_test'), 'Os testes só podem limpar um banco com nome terminado em _test.');
  db = criarConexao(connection);
  await db.orm.public.Instituicao.first();
  server = criarApp(db).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  url = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (server) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  if (db) await db.close();
});

// Token do usuário de teste, criado a cada cenário; as rotas do sistema exigem login.
let token = '';
const autorizacao = () => ({ Authorization: `Bearer ${token}` });

async function request(path: string, method = 'GET', body?: unknown, semToken = false) {
  const response = await fetch(`${url}${path}`, {
    method,
    headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(semToken ? {} : autorizacao()) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return {
    status: response.status,
    location: response.headers.get('location'),
    data: response.status === 204 ? null : response.headers.get('content-type')?.includes('application/json') ? await response.json() : await response.text(),
  };
}

// O Prisma 8 tipa VARCHAR(n) com o tamanho; no banco direto, a conversão é feita à mão.
const varchar = <N extends number>(valor: string) => valor as Varchar<N>;

const dadosAdotante = {
  cpf: '000.000.000-01', nome: 'Ana Teste', endereco: 'Rua A, 10',
  tipo_residencia: 'CASA', possui_animais: false, quantidade_animais: 0, data_nascimento: '1990-10-10',
};

beforeEach(async () => {
  // Apenas o banco dedicado e validado acima é limpo, nunca DATABASE_URL.
  await db.runtime().execute(db.raw.sql`TRUNCATE matches, animais_vacinas, animais, vacinas, adotantes, instituicoes, usuarios RESTART IDENTITY CASCADE`.affectedCount().build());
  const credenciais = { email: 'teste@email.com', senha: 'senhaSegura123' };
  await request('/usuarios', 'POST', { nome: 'Usuário Teste', ...credenciais }, true);
  token = (await request('/usuarios/login', 'POST', credenciais, true)).data.token;
  instituicao = (await request('/instituicoes', 'POST', {
    cnpj: '00.000.000/0000-01', razao_social: 'Abrigo Teste', endereco: 'Rua B, 20',
  })).data.id_instituicao;
  animal = (await request('/animais', 'POST', { tipo: 'cachorro', id_instituicao: instituicao })).data.id_animal;
  adotante = (await request('/adotantes', 'POST', dadosAdotante)).data.id_adotante;
  vacina = (await request('/vacinas', 'POST', { nome: 'Antirrábica' })).data.id_vacina;
});

test('CRUD de instituição persiste dados, atualiza parcialmente e exclui com 204', async () => {
  const novo = await request('/instituicoes', 'POST', { cnpj: '00000000000002', razao_social: 'Novo Abrigo', endereco: 'Rua C' });
  assert.equal(novo.status, 201);
  const path = novo.location!;
  assert.equal((await request(path)).data.cnpj, '00000000000002');
  assert.equal((await request(path, 'PUT', { razao_social: 'Abrigo Atualizado' })).data.endereco, 'Rua C');
  assert.equal((await request('/instituicoes')).data.length, 2);
  const outraConexao = criarConexao(process.env.TEST_DATABASE_URL);
  try {
    assert.equal((await outraConexao.orm.public.Instituicao.where({ id_instituicao: novo.data.id_instituicao }).first())?.razao_social, 'Abrigo Atualizado');
  } finally { await outraConexao.close(); }
  assert.equal((await request(path, 'DELETE')).status, 204);
  assert.equal((await request(path)).status, 404);
  assert.equal((await request(path, 'PUT', { endereco: 'Rua D' })).status, 404);
  assert.equal((await request(path, 'DELETE')).status, 404);
});

test('CPF/CNPJ normalizados são únicos na criação e atualização', async () => {
  assert.equal((await request('/instituicoes', 'POST', { cnpj: '00000000000001', razao_social: 'Outro', endereco: 'Rua' })).status, 409);
  assert.equal((await request('/adotantes', 'POST', { ...dadosAdotante, cpf: '00000000001' })).status, 409);
  const outro = await request('/adotantes', 'POST', { ...dadosAdotante, cpf: '00000000002' });
  assert.equal((await request(outro.location!, 'PUT', { cpf: '000.000.000-01' })).status, 409);
});

test('animal exige instituição válida e datas são persistidas como DATE', async () => {
  assert.equal((await request('/animais', 'POST', { tipo: 'gato' })).status, 400);
  assert.equal((await request('/animais', 'POST', { tipo: 'gato', id_instituicao: 999 })).status, 404);
  assert.equal((await request('/animais', 'POST', { tipo: 'gato', id_instituicao: instituicao, data_nascimento: '2025-02-29' })).status, 400);
  const novo = await request('/animais', 'POST', { tipo: 'GATO', id_instituicao: instituicao, data_nascimento: '2024-02-29' });
  assert.equal(novo.status, 201);
  assert.equal(novo.data.data_nascimento, '2024-02-29');
  assert.equal(novo.data.tipo, 'gato');
  assert.equal((await request('/animais/tipo/GATO')).data.length, 1);
  assert.equal((await request(novo.location!, 'PUT', { data_nascimento: null, raca: 'Siamês' })).data.data_nascimento, null);
  assert.equal((await request(novo.location!, 'DELETE')).status, 204);
});

test('aplicações preservam doses repetidas e possuem CRUD e histórico com vacina', async () => {
  const primeira = await request('/animais-vacinas', 'POST', { id_animal: animal, id_vacina: vacina, data_aplicacao: '2025-04-10' });
  const segunda = await request('/animais-vacinas', 'POST', { id_animal: animal, id_vacina: vacina, data_aplicacao: '2026-04-10' });
  assert.equal(primeira.status, 201);
  assert.equal(segunda.status, 201);
  assert.notEqual(primeira.data.id_animal_vacina, segunda.data.id_animal_vacina);
  const historico = await request(`/animais/${animal}/vacinas`);
  assert.equal(historico.data.length, 2);
  assert.equal(historico.data[0].vacina.nome, 'Antirrábica');
  assert.equal((await request(primeira.location!, 'PUT', { data_aplicacao: '2025-05-10' })).data.data_aplicacao, '2025-05-10');
  assert.equal((await request(segunda.location!)).status, 200);
  assert.equal((await request(segunda.location!, 'DELETE')).status, 204);
  assert.equal((await request('/animais-vacinas')).data.length, 1);
});

test('vacina tem CRUD e vínculos impedem exclusões de pais', async () => {
  assert.equal((await request(`/vacinas/${vacina}`, 'PUT', { nome: 'V8' })).data.nome, 'V8');
  assert.equal((await request('/vacinas')).data.length, 1);
  assert.equal((await request(`/vacinas/${vacina}`)).data.nome, 'V8');
  assert.equal((await request(`/instituicoes/${instituicao}`, 'DELETE')).status, 409);
  await request('/animais-vacinas', 'POST', { id_animal: animal, id_vacina: vacina, data_aplicacao: '2026-01-01' });
  assert.equal((await request(`/vacinas/${vacina}`, 'DELETE')).status, 409);
  assert.equal((await request(`/animais/${animal}`, 'DELETE')).status, 409);
  const extra = await request('/vacinas', 'POST', { nome: 'V4' });
  assert.equal((await request(extra.location!, 'DELETE')).status, 204);
});

test('atualização de adotante revalida a coerência dos dados combinados', async () => {
  const path = `/adotantes/${adotante}`;
  assert.equal((await request(path, 'PUT', { quantidade_animais: 2 })).status, 400);
  assert.equal((await request(path, 'PUT', { possui_animais: true, quantidade_animais: 2 })).status, 200);
  assert.equal((await request(path, 'PUT', { possui_animais: false })).status, 400);
  assert.equal((await request(path)).data.quantidade_animais, 2);
  assert.equal((await request('/adotantes')).data.length, 1);
  assert.equal((await request(path, 'DELETE')).status, 204);
});

test('match nasce pendente, recebe status e impede novos pedidos após aprovação', async () => {
  assert.equal((await request('/matches', 'POST', { id_adotante: adotante, id_animal: animal, status: 'APROVADO' })).status, 400);
  const novo = await request('/matches', 'POST', { id_adotante: adotante, id_animal: animal });
  assert.equal(novo.status, 201);
  assert.equal(novo.data.status, 'PENDENTE');
  assert.ok(Number.isFinite(Date.parse(novo.data.data_pedido)));
  assert.equal((await request(novo.location!, 'PUT', { status: 'EM ANDAMENTO' })).status, 200);
  assert.equal((await request(`${novo.location}/status`, 'PATCH', { status: 'APROVADO' })).status, 200);
  assert.equal((await request('/matches', 'POST', { id_adotante: adotante, id_animal: animal })).status, 409);
  assert.equal((await request(`/adotantes/${adotante}`, 'DELETE')).status, 409);
  assert.equal((await request(novo.location!, 'PUT', { id_animal: 999 })).status, 400);
  assert.equal((await request(novo.location!, 'DELETE')).status, 204);
});

test('duas aprovações simultâneas geram exatamente um sucesso', async () => {
  const primeiro = await request('/matches', 'POST', { id_adotante: adotante, id_animal: animal });
  const segundo = await request('/matches', 'POST', { id_adotante: adotante, id_animal: animal });
  const resultados = await Promise.all([primeiro, segundo].map((item) => request(item.location!, 'PUT', { status: 'APROVADO' })));
  assert.deepEqual(resultados.map((item) => item.status).sort(), [200, 409]);
  assert.equal((await request('/matches')).data.filter((item: { status: string }) => item.status === 'APROVADO').length, 1);
});

test('o banco aplica o índice parcial e as restrições mesmo sem os controllers', async () => {
  const status = APROVADO;
  await db.orm.public.Match.create({ id_adotante: adotante, id_animal: animal, status });
  await assert.rejects(db.orm.public.Match.create({ id_adotante: adotante, id_animal: animal, status }), (erro: unknown) => (erro as { sqlState: string }).sqlState === '23505');
  await assert.rejects(db.orm.public.Adotante.where({ id_adotante: adotante }).update({ quantidade_animais: -1 }), (erro: unknown) => (erro as { sqlState: string }).sqlState === '23514');
});

test('validação de IDs, corpos, JSON e atualizações vazias retorna erros HTTP', async () => {
  for (const id of ['abc', '0', '-1', '1.5', '2147483648']) {
    assert.equal((await request(`/animais/${id}`)).status, 400);
  }
  assert.equal((await request('/animais/2147483647')).status, 404);
  assert.equal((await request('/vacinas', 'POST', [])).status, 400);
  assert.equal((await request('/vacinas', 'POST')).status, 400);
  assert.equal((await request(`/vacinas/${vacina}`, 'PUT', {})).status, 400);
  assert.equal((await request(`/vacinas/${vacina}`, 'PUT', { id_vacina: 99 })).status, 400);
  const resposta = await fetch(`${url}/vacinas`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...autorizacao() }, body: '{"nome":' });
  assert.equal(resposta.status, 400);
  await resposta.json();
  assert.equal((await request('/nao-existe')).status, 404);
});

test('rotas básicas, saudação e soma continuam disponíveis na mesma API', async () => {
  assert.match((await request('/')).data, /Bem-vindo.*Match de Adoção/);
  const sobre = await request('/sobre');
  assert.equal(sobre.data.entidades.length, 6);
  assert.equal(sobre.data.armazenamento, 'PostgreSQL');
  assert.equal((await request('/saudacao/Jo%C3%A3o')).data, 'Olá, João!');
  assert.deepEqual((await request('/calculo/soma/2/3')).data, { num1: 2, num2: 3, resultado: 5 });
  assert.equal((await request('/calculo/soma/-2.5/1')).data.resultado, -1.5);
});

test('soma rejeita entradas inválidas e resultados infinitos', async () => {
  for (const path of ['/calculo/soma/abc/1', '/calculo/soma/2x/1', '/calculo/soma/Infinity/1', '/calculo/soma/1e308/1e308', '/calculo/soma/%20/1', '/calculo/soma/0x10/1']) {
    assert.equal((await request(path)).status, 400, path);
  }
});

test('os seis módulos e o filtro por tipo usam os dados persistidos', async () => {
  for (const path of ['/instituicoes', '/animais', '/vacinas', '/animais-vacinas', '/adotantes', '/matches']) {
    const result = await request(path);
    assert.equal(result.status, 200, path);
    assert.ok(Array.isArray(result.data), path);
  }
  assert.equal((await request('/animais/tipo/CACHORRO')).data[0].id_animal, animal);
  assert.deepEqual((await request('/animais/tipo/coelho')).data, []);
});

test('campos gerados e opcionais mantêm o comportamento dos cadastros', async () => {
  const novo = await request('/animais', 'POST', { tipo: 'GATO', id_instituicao: instituicao, id_animal: 999 });
  assert.equal(novo.status, 201);
  assert.notEqual(novo.data.id_animal, 999);
  assert.equal(novo.data.raca, null);
  assert.equal(novo.data.data_nascimento, null);
  assert.equal(novo.data.foto, null);
  const match = await request('/matches', 'POST', { id_adotante: adotante, id_animal: novo.data.id_animal, data_pedido: '2000-01-01' });
  assert.equal(match.status, 201);
  assert.notEqual(match.data.data_pedido, '2000-01-01');
});

test('datas, limites e coerência de adotantes continuam validados', async () => {
  for (const data_nascimento of ['2026-02-30', '2026-13-01', '16/11/2026', '0000-01-01']) {
    assert.equal((await request('/animais', 'POST', { tipo: 'gato', id_instituicao: instituicao, data_nascimento })).status, 400);
  }
  assert.equal((await request('/vacinas', 'POST', { nome: 'a'.repeat(151) })).status, 400);
  assert.equal((await request('/animais', 'POST', { tipo: 'a'.repeat(51), id_instituicao: instituicao })).status, 400);
  for (const dados of [{ quantidade_animais: -1 }, { possui_animais: 'false' }, { possui_animais: true, quantidade_animais: 0 }, { tipo_residencia: 'HOTEL' }, { nome: ' ' }]) {
    assert.equal((await request('/adotantes', 'POST', { ...dadosAdotante, ...dados })).status, 400);
  }
});

test('referências de match e vacinação inexistentes são rejeitadas', async () => {
  assert.equal((await request('/matches', 'POST', { id_adotante: 999, id_animal: animal })).status, 404);
  assert.equal((await request('/matches', 'POST', { id_adotante: adotante, id_animal: 999 })).status, 404);
  assert.equal((await request('/animais-vacinas', 'POST', { id_animal: animal, id_vacina: 999, data_aplicacao: '2026-01-01' })).status, 404);
});

test('payload grande e parâmetros mal codificados retornam erros tratados', async () => {
  assert.equal((await request('/vacinas', 'POST', { nome: 'a'.repeat(110000) })).status, 413);
  assert.equal((await request('/saudacao/%E0%A4%A')).status, 400);
});

test('fluxo de Promises persiste a adoção no mesmo banco consultado pela API', async () => {
  const mensagens: string[] = [];
  const erros: string[] = [];
  const match = await processarAdocao(db, { id_adotante: adotante, id_animal: animal }, {
    registrar: (mensagem) => mensagens.push(mensagem), registrarErro: (mensagem) => erros.push(mensagem),
  });
  assert.ok(match);
  assert.equal(match.status, 'APROVADO');
  assert.equal((await request(`/matches/${match.id_match}`)).data.status, 'APROVADO');
  assert.match(mensagens[0], /Ana Teste.*cachorro.*Abrigo Teste/);
  assert.match(mensagens[1], /nenhuma aplicação registrada/);
  assert.equal(mensagens.length, 4);
  assert.deepEqual(erros, []);
  assert.equal((await request('/matches', 'POST', { id_adotante: adotante, id_animal: animal })).status, 409);
});

test('erro no fluxo preserva o match pendente e não aprova a adoção', async () => {
  const erros: string[] = [];
  assert.equal(await processarAdocao(db, { id_adotante: adotante, id_animal: animal }, {
    falharNaAnalise: true, registrar: () => {}, registrarErro: (mensagem) => erros.push(mensagem),
  }), null);
  const matches = (await request('/matches')).data;
  assert.equal(matches.length, 1);
  assert.equal(matches[0].status, 'PENDENTE');
  assert.match(erros[0], /Erro ao analisar/);
});

test('erros de validação seguem o formato padrão com campo e mensagem', async () => {
  const curto = await request('/adotantes', 'POST', { ...dadosAdotante, nome: 'Al', cpf: '123' });
  assert.equal(curto.status, 400);
  assert.equal(curto.data.error, 'Dados inválidos');
  assert.deepEqual(curto.data.details, [
    { campo: 'cpf', mensagem: 'cpf deve conter 11 dígitos.' },
    { campo: 'nome', mensagem: 'nome deve ter no mínimo 3 caracteres.' },
  ]);
  const semCorpo = await request('/vacinas', 'POST');
  assert.deepEqual(semCorpo.data, { error: 'Dados inválidos', details: [{ campo: '', mensagem: 'Envie um objeto JSON.' }] });
  const filtro = await request('/animais/tipo/%20');
  assert.equal(filtro.status, 400);
  assert.equal(filtro.data.details[0].campo, 'tipo');
});

test('adotante exige data de nascimento válida, maior de idade, e a devolve como instante UTC', async () => {
  const { data_nascimento, ...semData } = dadosAdotante;
  const ausente = await request('/adotantes', 'POST', { ...semData, cpf: '00000000010' });
  assert.deepEqual(ausente.data.details, [{ campo: 'data_nascimento', mensagem: 'A data de nascimento é obrigatória' }]);
  for (const invalida of ['20/07/1995', '1990-02-30']) {
    const resposta = await request('/adotantes', 'POST', { ...dadosAdotante, cpf: '00000000011', data_nascimento: invalida });
    assert.deepEqual(resposta.data.details, [{ campo: 'data_nascimento', mensagem: 'Data inválida (use o formato AAAA-MM-DD)' }]);
  }
  const anoAtual = new Date().getUTCFullYear();
  const menor = await request('/adotantes', 'POST', { ...dadosAdotante, cpf: '00000000012', data_nascimento: `${anoAtual - 10}-01-01` });
  assert.deepEqual(menor.data.details, [{ campo: 'data_nascimento', mensagem: 'O adotante deve ter pelo menos 18 anos' }]);
  const criado = await request('/adotantes', 'POST', { ...dadosAdotante, cpf: '00000000013', data_nascimento: '1990-10-10' });
  assert.equal(criado.status, 201);
  assert.equal(criado.data.data_nascimento, '1990-10-10T00:00:00Z');
  assert.equal((await request(criado.location!)).data.data_nascimento, '1990-10-10T00:00:00Z');
});

test('adotantes anteriores à migração ficam sem data e podem recebê-la na atualização', async () => {
  // Registro criado direto no banco, como os que existiam antes da coluna data_nascimento.
  const antigo = await db.orm.public.Adotante.create({
    cpf: varchar<11>('00000000020'), nome: varchar<200>('Antigo'), endereco: varchar<255>('Rua Velha'), tipo_residencia: varchar<30>('CASA'),
    possui_animais: false, quantidade_animais: 0,
  });
  const caminho = `/adotantes/${antigo.id_adotante}`;
  assert.equal((await request(caminho)).data.data_nascimento, null);
  assert.equal((await request(caminho, 'PUT', { data_nascimento: '2010-01-01' })).status, 400);
  assert.equal((await request(caminho, 'PUT', {})).status, 400);
  assert.equal((await request(caminho, 'PUT', { id_adotante: 5 })).status, 400);
  const atualizado = await request(caminho, 'PUT', { data_nascimento: '1988-03-15' });
  assert.equal(atualizado.status, 200);
  assert.equal(atualizado.data.data_nascimento, '1988-03-15T00:00:00Z');
  assert.equal(atualizado.data.nome, 'Antigo');
});

test('animal aceita apelido opcional e a atualização revalida a instituição informada', async () => {
  const com = await request('/animais', 'POST', { tipo: 'cachorro', id_instituicao: instituicao, apelido: 'Bru' });
  assert.equal(com.data.apelido, 'Bru');
  assert.equal((await request('/animais', 'POST', { tipo: 'cachorro', id_instituicao: instituicao })).data.apelido, null);
  assert.equal((await request(com.location!, 'PUT', { apelido: null })).data.apelido, null);
  assert.equal((await request(com.location!, 'PUT', { id_instituicao: 999 })).status, 404);
  assert.equal((await request(com.location!, 'PUT', { id_instituicao: 0 })).status, 400);
  assert.equal((await request(com.location!, 'PUT', { raca: 'Vira-lata' })).data.raca, 'Vira-lata');
});

test('documentação OpenAPI é publicada em /docs.json e a interface do Swagger em /docs', async () => {
  const doc = await request('/docs.json');
  assert.equal(doc.status, 200);
  assert.equal(doc.data.openapi, '3.0.0');
  assert.match(doc.data.servers[0].url, /^http:\/\/localhost:\d+$/);
  const caminhos = Object.keys(doc.data.paths);
  for (const esperado of [
    '/instituicoes', '/instituicoes/{id}', '/animais', '/animais/{id}', '/animais/tipo/{tipo}', '/animais/{id}/vacinas',
    '/vacinas', '/vacinas/{id}', '/animais-vacinas', '/animais-vacinas/{id}', '/adotantes', '/adotantes/{id}',
    '/matches', '/matches/hoje', '/matches/{id}', '/matches/{id}/status', '/', '/sobre', '/saudacao/{nome}', '/calculo/soma/{num1}/{num2}',
  ]) assert.ok(caminhos.includes(esperado), esperado);
  assert.deepEqual(Object.keys(doc.data.paths['/matches/{id}']).sort(), ['delete', 'get', 'put']);
  for (const nome of ['ErrorResponse', 'ValidationErrorResponse', 'CreateAdotanteInput', 'UpdateAnimalInput', 'Match']) {
    assert.ok(doc.data.components.schemas[nome], nome);
  }
  assert.equal(doc.data.components.schemas.CreateAdotanteInput.properties.data_nascimento.format, 'date');
  const ui = await fetch(`${url}/docs/`);
  assert.equal(ui.status, 200);
  assert.match(await ui.text(), /swagger-ui/i);
});

test(':id inválido é rejeitado pelo middleware com o formato padrão de validação', async () => {
  for (const id of ['abc', '0', '-1', '1.5', '2147483648', '1e2', '0x10', '%201']) {
    for (const [metodo, caminho, corpo] of [['GET', `/vacinas/${id}`], ['PUT', `/vacinas/${id}`, { nome: 'V10' }], ['DELETE', `/vacinas/${id}`], ['GET', `/animais/${id}/vacinas`], ['PATCH', `/matches/${id}/status`, { status: 'CANCELADO' }]] as [string, string, unknown?][]) {
      const resposta = await request(caminho, metodo, corpo);
      assert.equal(resposta.status, 400, `${metodo} ${caminho}`);
      assert.equal(resposta.data.error, 'Dados inválidos');
      assert.equal(resposta.data.details[0].campo, 'id');
    }
  }
  assert.equal((await request('/vacinas/abc')).data.details[0].mensagem, 'O id deve ser um número inteiro maior que zero.');
  // O id é validado antes do corpo.
  assert.equal((await request('/vacinas/abc', 'PUT', {})).data.details.length, 1);
});

test('respostas reais da API seguem os schemas de resposta usados na documentação', async () => {
  const dose = await request('/animais-vacinas', 'POST', { id_animal: animal, id_vacina: vacina, data_aplicacao: '2026-04-10' });
  const match = await request('/matches', 'POST', { id_adotante: adotante, id_animal: animal });
  const completo = await request('/animais', 'POST', { tipo: 'gato', raca: 'Siamês', data_nascimento: '2024-01-02', detalhes: 'x', foto: 'f.jpg', apelido: 'Mimi', id_instituicao: instituicao });
  const casos: [string, { parse(valor: unknown): unknown }, string[]][] = [
    ['instituicoes', instituicaoResponseSchema, [`/instituicoes/${instituicao}`]],
    ['animais', animalResponseSchema, [`/animais/${animal}`, completo.location!]],
    ['vacinas', vacinaResponseSchema, [`/vacinas/${vacina}`]],
    ['animais-vacinas', animalVacinaResponseSchema, [dose.location!]],
    ['adotantes', adotanteResponseSchema, [`/adotantes/${adotante}`]],
    ['matches', matchResponseSchema, [match.location!]],
  ];
  for (const [colecao, schema, itens] of casos) {
    const lista = await request(`/${colecao}`);
    assert.ok(lista.data.length >= 1, colecao);
    for (const item of lista.data) schema.parse(item);
    for (const caminho of itens) schema.parse((await request(caminho)).data);
  }
  for (const item of (await request(`/animais/${animal}/vacinas`)).data) animalVacinaDetalhadaResponseSchema.parse(item);
  for (const item of (await request('/animais/tipo/gato')).data) animalResponseSchema.parse(item);
  // Documentado como nulo em adotantes anteriores à coluna de data de nascimento.
  adotanteResponseSchema.parse({ ...(await request(`/adotantes/${adotante}`)).data, data_nascimento: null });
});

test('os códigos de erro devolvidos pela API estão documentados na rota correspondente', async () => {
  const doc = (await request('/docs.json')).data;
  const conferir = (resposta: { status: number }, metodo: string, modelo: string) => {
    const documentados = Object.keys(doc.paths[modelo]?.[metodo]?.responses ?? {});
    assert.ok(documentados.includes(String(resposta.status)), `${metodo.toUpperCase()} ${modelo} devolveu ${resposta.status}; documentados: ${documentados}`);
  };
  const malformado = (caminho: string, metodo: string, corpo: string) =>
    fetch(`${url}${caminho}`, { method: metodo, headers: { 'Content-Type': 'application/json', ...autorizacao() }, body: corpo });
  const aprovar = async (id: number) => request(`/matches/${id}`, 'PUT', { status: 'APROVADO' });

  const primeiro = (await request('/matches', 'POST', { id_adotante: adotante, id_animal: animal })).data.id_match;
  const segundo = (await request('/matches', 'POST', { id_adotante: adotante, id_animal: animal })).data.id_match;
  await request('/animais-vacinas', 'POST', { id_animal: animal, id_vacina: vacina, data_aplicacao: '2026-01-01' });
  assert.equal((await aprovar(primeiro)).status, 200);

  conferir(await request('/instituicoes', 'POST', { cnpj: '00000000000001', razao_social: 'Dup', endereco: 'R' }), 'post', '/instituicoes');
  conferir(await request('/instituicoes', 'POST', {}), 'post', '/instituicoes');
  conferir(await request('/instituicoes/999', 'PUT', { endereco: 'R' }), 'put', '/instituicoes/{id}');
  conferir(await request(`/instituicoes/${instituicao}`, 'DELETE'), 'delete', '/instituicoes/{id}');
  conferir(await request('/instituicoes/abc'), 'get', '/instituicoes/{id}');
  conferir(await request('/animais', 'POST', { tipo: 'gato', id_instituicao: 999 }), 'post', '/animais');
  conferir(await request('/animais/999', 'PUT', { tipo: 'gato' }), 'put', '/animais/{id}');
  conferir(await request(`/animais/${animal}`, 'DELETE'), 'delete', '/animais/{id}');
  conferir(await request('/animais/tipo/%20'), 'get', '/animais/tipo/{tipo}');
  conferir(await request('/animais/999/vacinas'), 'get', '/animais/{id}/vacinas');
  conferir(await request(`/vacinas/${vacina}`, 'DELETE'), 'delete', '/vacinas/{id}');
  conferir(await request('/animais-vacinas', 'POST', { id_animal: animal, id_vacina: 999, data_aplicacao: '2026-01-01' }), 'post', '/animais-vacinas');
  conferir(await request('/adotantes', 'POST', { ...dadosAdotante, cpf: '00000000001' }), 'post', '/adotantes');
  conferir(await request(`/adotantes/${adotante}`, 'DELETE'), 'delete', '/adotantes/{id}');
  conferir(await request('/matches', 'POST', { id_adotante: 999, id_animal: animal }), 'post', '/matches');
  conferir(await request('/matches', 'POST', { id_adotante: adotante, id_animal: animal }), 'post', '/matches');
  conferir(await aprovar(segundo), 'put', '/matches/{id}');
  conferir(await request('/matches/999', 'DELETE'), 'delete', '/matches/{id}');
  conferir(await request('/matches/hoje'), 'get', '/matches/hoje');
  conferir(await request(`/matches/${segundo}/status`, 'PATCH', { status: 'APROVADO' }), 'patch', '/matches/{id}/status');
  conferir(await request('/matches/999/status', 'PATCH', { status: 'CANCELADO' }), 'patch', '/matches/{id}/status');
  conferir(await request('/saudacao/%E0%A4%A'), 'get', '/saudacao/{nome}');
  conferir(await request('/calculo/soma/abc/1'), 'get', '/calculo/soma/{num1}/{num2}');
  for (const [metodo, caminho, modelo] of [['POST', '/vacinas', '/vacinas'], ['PUT', '/vacinas/1', '/vacinas/{id}'], ['PATCH', '/matches/1/status', '/matches/{id}/status']]) {
    const json = await malformado(caminho, metodo, '{"nome":');
    assert.equal(json.status, 400);
    assert.deepEqual(Object.keys(await json.json()), ['error']);
    conferir(json, metodo.toLowerCase(), modelo);
    conferir(await malformado(caminho, metodo, JSON.stringify({ nome: 'a'.repeat(110000) })).then((r) => r), metodo.toLowerCase(), modelo);
  }
});

test('repositories traduzem erros do banco em erros da aplicação e retornam null quando não há registro', async () => {
  const instituicoes = instituicaoRepository(db);
  assert.equal(await instituicoes.findById(999999), null);
  assert.equal(await instituicoes.update(999999, { endereco: varchar<255>('R') }), null);
  assert.equal(await instituicoes.delete(999999), null);
  const existente = (await instituicoes.findAll())[0];
  await assert.rejects(instituicoes.create({ cnpj: existente.cnpj, razao_social: varchar<200>('Dup'), endereco: varchar<255>('R') }), RegistroDuplicadoError);
  await assert.rejects(instituicoes.delete(existente.id_instituicao), ReferenciaInvalidaError);
  await assert.rejects(adotanteRepository(db).update(adotante, { quantidade_animais: -1 }), DadosInvalidosError);
  assert.equal((await animalRepository(db).findByTipo(varchar<50>('cachorro'))).length, 1);
});

test('transação com bloqueio do animal: operações são desfeitas em caso de erro', async () => {
  await assert.rejects(animalRepository(db).bloquear(animal), /exige uma transação/);
  await assert.rejects(emTransacao(db, async (tx) => {
    assert.ok(await animalRepository(db, tx).bloquear(animal));
    assert.equal(await animalRepository(db, tx).bloquear(999999), null);
    await matchRepository(db, tx).create({ id_adotante: adotante, id_animal: animal });
    throw new Error('desfaz');
  }), /desfaz/);
  assert.deepEqual(await matchRepository(db).findAll(), []);
  const criado = await emTransacao(db, (tx) => matchRepository(db, tx).create({ id_adotante: adotante, id_animal: animal }));
  assert.equal((await matchRepository(db).findById(criado.id_match))?.status, 'PENDENTE');
  assert.equal(await matchRepository(db).findAprovadoByAnimal(animal), null);
});

test('buscas de regra de negócio: adotante por CPF e pedidos de hoje no fuso de Brasília', async () => {
  const encontrado = await adotanteRepository(db).findByCpf(varchar<11>('00000000001'));
  assert.equal(encontrado?.id_adotante, adotante);
  assert.equal(await adotanteRepository(db).findByCpf(varchar<11>('99999999999')), null);

  const hoje = await matchRepository(db).create({ id_adotante: adotante, id_animal: animal });
  const ontem = await db.orm.public.Match.create({
    id_adotante: adotante, id_animal: animal, data_pedido: Temporal.Now.instant().subtract({ hours: 30 }),
  });
  const amanha = await db.orm.public.Match.create({
    id_adotante: adotante, id_animal: animal, data_pedido: Temporal.Now.instant().add({ hours: 30 }),
  });
  const ids = (await matchRepository(db).findPedidosHoje()).map((m) => m.id_match);
  assert.deepEqual(ids, [hoje.id_match]);
  assert.ok(!ids.includes(ontem.id_match) && !ids.includes(amanha.id_match));
});

test('services aplicam as regras de unicidade com mensagem clara e permitem manter o próprio valor', async () => {
  const outra = (await request('/instituicoes', 'POST', { cnpj: '00000000000002', razao_social: 'Outra', endereco: 'R' })).location!;
  const duplicada = await request('/instituicoes', 'POST', { cnpj: '00.000.000/0000-01', razao_social: 'Dup', endereco: 'R' });
  assert.deepEqual([duplicada.status, duplicada.data], [409, { error: 'CNPJ já cadastrado' }]);
  assert.equal((await request(outra, 'PUT', { cnpj: '00000000000002', razao_social: 'Mesma' })).status, 200);
  const conflito = await request(outra, 'PUT', { cnpj: '00000000000001' });
  assert.deepEqual([conflito.status, conflito.data], [409, { error: 'CNPJ já utilizado por outra instituição' }]);

  const dup = await request('/adotantes', 'POST', { ...dadosAdotante, cpf: '000.000.000-01' });
  assert.deepEqual([dup.status, dup.data], [409, { error: 'CPF já cadastrado' }]);
  const outro = (await request('/adotantes', 'POST', { ...dadosAdotante, cpf: '00000000003' })).location!;
  assert.equal((await request(outro, 'PUT', { cpf: '00000000003', nome: 'Mesmo CPF' })).status, 200);
  const conflitoCpf = await request(outro, 'PUT', { cpf: '00000000001' });
  assert.deepEqual([conflitoCpf.status, conflitoCpf.data], [409, { error: 'CPF já utilizado por outro adotante' }]);
  // 404 do service tem prioridade sobre as demais regras.
  assert.equal((await request('/adotantes/999999', 'PUT', { cpf: '00000000001' })).status, 404);
});

test('cadastros simultâneos com o mesmo CNPJ/CPF resultam em um 201 e os demais 409, sem 500', async () => {
  const cnpj = await Promise.all(Array.from({ length: 6 }, () => request('/instituicoes', 'POST', { cnpj: '00000000000009', razao_social: 'Corrida', endereco: 'R' })));
  assert.deepEqual(cnpj.map((r) => r.status).sort(), [201, 409, 409, 409, 409, 409]);
  const cpf = await Promise.all(Array.from({ length: 6 }, () => request('/adotantes', 'POST', { ...dadosAdotante, cpf: '00000000009' })));
  assert.deepEqual(cpf.map((r) => r.status).sort(), [201, 409, 409, 409, 409, 409]);
});

test('GET /matches/hoje lista os pedidos de hoje e não é confundido com um id', async () => {
  assert.deepEqual((await request('/matches/hoje')).data, []);
  const novo = await request('/matches', 'POST', { id_adotante: adotante, id_animal: animal });
  const hoje = await request('/matches/hoje');
  assert.equal(hoje.status, 200);
  assert.deepEqual(hoje.data.map((m: { id_match: number }) => m.id_match), [novo.data.id_match]);
  matchResponseSchema.parse(hoje.data[0]);
  assert.equal((await request('/matches/abc')).status, 400);
  assert.equal((await request(novo.location!, 'DELETE')).status, 204);
  assert.equal((await request(novo.location!, 'DELETE')).status, 404);
});

const novoUsuario = { nome: 'Maria da Silva', email: 'maria@email.com', senha: 'senhaSegura123' };

test('cadastro de usuário: senha criptografada com bcrypt, nunca devolvida, e-mail único sem diferenciar maiúsculas', async () => {
  const criado = await request('/usuarios', 'POST', { ...novoUsuario, email: ' Maria@Email.com ' }, true);
  assert.equal(criado.status, 201);
  assert.deepEqual(Object.keys(criado.data).sort(), ['created_at', 'email', 'id_usuario', 'nome']);
  assert.equal(criado.data.email, 'maria@email.com');
  usuarioResponseSchema.parse(criado.data);
  const gravado = await db.orm.public.Usuario.where({ id_usuario: criado.data.id_usuario }).first();
  assert.match(gravado!.senha, /^\$2[aby]\$10\$/);
  assert.notEqual(gravado!.senha, novoUsuario.senha);
  const repetido = await request('/usuarios', 'POST', { ...novoUsuario, email: 'MARIA@email.com' }, true);
  assert.deepEqual([repetido.status, repetido.data], [409, { error: 'E-mail já cadastrado' }]);
  const simultaneos = await Promise.all(Array.from({ length: 5 }, () => request('/usuarios', 'POST', { ...novoUsuario, email: 'corrida@email.com' }, true)));
  assert.deepEqual(simultaneos.map((r) => r.status).sort(), [201, 409, 409, 409, 409]);
});

test('cadastro de usuário valida nome, e-mail e senha com o formato padrão de erros', async () => {
  const invalido = await request('/usuarios', 'POST', { nome: 'Al', email: 'nao-e-email', senha: '123' }, true);
  assert.equal(invalido.status, 400);
  assert.deepEqual(invalido.data.details.map((d: { campo: string }) => d.campo).sort(), ['email', 'nome', 'senha']);
  const mensagens = Object.fromEntries(invalido.data.details.map((d: { campo: string; mensagem: string }) => [d.campo, d.mensagem]));
  assert.equal(mensagens.email, 'O email deve ser válido');
  assert.equal(mensagens.senha, 'A senha deve ter pelo menos 8 caracteres');
  assert.equal((await request('/usuarios', 'POST', { ...novoUsuario, senha: 'a'.repeat(73) }, true)).status, 400);
  assert.equal((await request('/usuarios', 'POST', { ...novoUsuario, email: `${'a'.repeat(250)}@x.com` }, true)).status, 400);
  assert.equal((await request('/usuarios', 'POST', undefined, true)).status, 400);
  assert.equal((await request('/usuarios/login', 'POST', { email: 'x@y.com' }, true)).status, 400);
});

test('login devolve JWT de 1 hora com o id e responde igual para e-mail inexistente e senha errada', async () => {
  await request('/usuarios', 'POST', novoUsuario, true);
  const ok = await request('/usuarios/login', 'POST', { email: 'MARIA@email.com', senha: novoUsuario.senha }, true);
  assert.equal(ok.status, 200);
  const payload = jwt.decode(ok.data.token) as { id: number; iat: number; exp: number };
  assert.equal(typeof payload.id, 'number');
  assert.equal(payload.exp - payload.iat, 3600);
  const senhaErrada = await request('/usuarios/login', 'POST', { email: novoUsuario.email, senha: 'outraSenha123' }, true);
  const naoExiste = await request('/usuarios/login', 'POST', { email: 'ninguem@email.com', senha: novoUsuario.senha }, true);
  assert.deepEqual([senhaErrada.status, senhaErrada.data], [401, { error: 'Credenciais inválidas' }]);
  assert.deepEqual([naoExiste.status, naoExiste.data], [401, { error: 'Credenciais inválidas' }]);
});

test('rotas do sistema exigem token: ausente, mal formado, alterado, expirado ou de outro segredo → 401', async () => {
  for (const caminho of ['/instituicoes', '/animais', '/vacinas', '/animais-vacinas', '/adotantes', '/matches', '/matches/hoje', '/animais/tipo/gato', `/animais/${animal}/vacinas`, '/instituicoes/abc']) {
    const sem = await request(caminho, 'GET', undefined, true);
    assert.deepEqual([sem.status, sem.data], [401, { error: 'Token não informado' }], caminho);
  }
  for (const [metodo, caminho, corpo] of [['POST', '/vacinas', { nome: 'X' }], ['PUT', `/vacinas/${vacina}`, { nome: 'X' }], ['DELETE', `/vacinas/${vacina}`], ['PATCH', '/matches/1/status', { status: 'CANCELADO' }], ['POST', '/matches', {}]] as [string, string, unknown?][]) {
    assert.equal((await request(caminho, metodo, corpo, true)).status, 401, `${metodo} ${caminho}`);
  }
  const chamar = (cabecalho?: string) => fetch(`${url}/vacinas`, { headers: cabecalho ? { Authorization: cabecalho } : {} }).then(async (r) => [r.status, await r.json()]);
  assert.deepEqual(await chamar(`Basic ${token}`), [401, { error: 'Token não informado' }]);
  assert.deepEqual(await chamar('Bearer'), [401, { error: 'Token não informado' }]);
  assert.deepEqual(await chamar(`Bearer ${token} extra`), [401, { error: 'Token não informado' }]);
  assert.deepEqual(await chamar(`bearer ${token}`), [401, { error: 'Token não informado' }]);
  const invalido = { error: 'Token inválido ou expirado' };
  assert.deepEqual(await chamar('Bearer abc.def.ghi'), [401, invalido]);
  const partes = token.split('.');
  const adulterado = `${partes[0]}.${Buffer.from(JSON.stringify({ id: 999, iat: 1 })).toString('base64url')}.${partes[2]}`;
  assert.deepEqual(await chamar(`Bearer ${adulterado}`), [401, invalido]);
  assert.deepEqual(await chamar(`Bearer ${jwt.sign({ id: 1 }, 'outro-segredo', { expiresIn: '1h' })}`), [401, invalido]);
  assert.deepEqual(await chamar(`Bearer ${jwt.sign({ id: 1 }, process.env.JWT_SECRET!, { expiresIn: -10 })}`), [401, invalido]);
  assert.deepEqual(await chamar(`Bearer ${jwt.sign({ id: 1 }, process.env.JWT_SECRET!, { algorithm: 'HS512' })}`), [401, invalido]);
  assert.deepEqual(await chamar(`Bearer ${jwt.sign({ sub: 'x' }, process.env.JWT_SECRET!)}`), [401, invalido]);
  assert.equal((await chamar(`Bearer ${token}`))[0], 200);
});

test('rotas públicas continuam abertas: básicas, documentação, cadastro e login', async () => {
  for (const caminho of ['/', '/sobre', '/saudacao/Ana', '/calculo/soma/1/2', '/docs.json']) {
    assert.equal((await request(caminho, 'GET', undefined, true)).status, 200, caminho);
  }
  assert.equal((await fetch(`${url}/docs/`)).status, 200);
  assert.equal((await request('/nao-existe', 'GET', undefined, true)).status, 404);
});

test('GET /usuarios exige token e lista sem as senhas; logout invalida o token', async () => {
  assert.equal((await request('/usuarios', 'GET', undefined, true)).status, 401);
  const lista = await request('/usuarios');
  assert.equal(lista.status, 200);
  assert.equal(lista.data.length, 1);
  for (const usuario of lista.data) { usuarioResponseSchema.parse(usuario); assert.equal('senha' in usuario, false); }

  assert.equal((await request('/usuarios/logout', 'POST', undefined, true)).status, 401);
  const saiu = await request('/usuarios/logout', 'POST');
  assert.deepEqual([saiu.status, saiu.data], [200, { message: 'Logout realizado com sucesso' }]);
  // Mesmo token: agora invalidado em todas as rotas protegidas.
  assert.deepEqual((await request('/vacinas')).data, { error: 'Token inválido' });
  assert.equal((await request('/vacinas')).status, 401);
  assert.equal((await request('/usuarios/logout', 'POST')).status, 401);
  // Um novo login, mesmo logo após o logout, gera outro token válido (jti único).
  const novo = await request('/usuarios/login', 'POST', { email: 'teste@email.com', senha: 'senhaSegura123' }, true);
  token = novo.data.token;
  assert.equal((await request('/vacinas')).status, 200);
});

test('Swagger documenta o esquema Bearer, as rotas de usuário e o 401 em todas as rotas protegidas', async () => {
  const doc = (await request('/docs.json', 'GET', undefined, true)).data;
  assert.deepEqual(doc.components.securitySchemes.bearerAuth, { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' });
  const publicas = new Set(['/', '/sobre', '/saudacao/{nome}', '/calculo/soma/{num1}/{num2}', 'post /usuarios', 'post /usuarios/login']);
  let protegidas = 0;
  for (const [caminho, metodos] of Object.entries<Record<string, { security?: unknown; responses: Record<string, unknown> }>>(doc.paths)) {
    for (const [metodo, rota] of Object.entries(metodos)) {
      if (publicas.has(caminho) || publicas.has(`${metodo} ${caminho}`)) {
        assert.equal(rota.security, undefined, `${metodo} ${caminho}`);
        continue;
      }
      protegidas++;
      assert.deepEqual(rota.security, [{ bearerAuth: [] }], `${metodo} ${caminho}`);
      assert.ok('401' in rota.responses, `${metodo} ${caminho}`);
    }
  }
  assert.equal(protegidas, 36);
  for (const nome of ['CreateUsuarioInput', 'LoginInput', 'Usuario', 'TokenResponse']) assert.ok(doc.components.schemas[nome], nome);
  assert.equal(doc.components.schemas.Usuario.properties.senha, undefined);
});
