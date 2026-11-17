import 'temporal-polyfill/global';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { z } from 'zod';
import { idadeEmAnos } from '../src/shared/schemas';
import { createAdotanteSchema, updateAdotanteSchema, coerenciaAnimaisSchema } from '../src/modules/adotante/adotante.schema';
import { createAnimalSchema, updateAnimalSchema, filtroTipoSchema } from '../src/modules/animal/animal.schema';
import { createInstituicaoSchema, updateInstituicaoSchema } from '../src/modules/instituicao/instituicao.schema';
import { createVacinaSchema } from '../src/modules/vacina/vacina.schema';
import { createAnimalVacinaSchema } from '../src/modules/animal-vacina/animal-vacina.schema';
import { createMatchSchema, updateMatchSchema } from '../src/modules/match/match.schema';

// Resultado simplificado de uma validação com falha: [campo, mensagem].
function erros(schema: z.ZodType, dados: unknown): [string, string][] {
  const resultado = schema.safeParse(dados);
  assert.equal(resultado.success, false, 'a validação deveria falhar');
  return resultado.error!.issues.map((issue) => [issue.path.join('.'), issue.message]);
}

function aprovado<T extends z.ZodType>(schema: T, dados: unknown): z.output<T> {
  const resultado = schema.safeParse(dados);
  assert.equal(resultado.success, true, resultado.success ? '' : JSON.stringify(resultado.error.issues));
  return resultado.data as z.output<T>;
}

// Data AAAA-MM-DD relativa a hoje (UTC), para que os testes de idade não envelheçam.
function haAnos(anos: number, dias = 0): string {
  const data = new Date();
  data.setUTCFullYear(data.getUTCFullYear() - anos);
  data.setUTCDate(data.getUTCDate() + dias);
  return data.toISOString().slice(0, 10);
}

const adotante = {
  cpf: '000.000.000-01', nome: 'Ana Teste', endereco: 'Rua A, 10',
  tipo_residencia: 'casa', possui_animais: false, quantidade_animais: 0,
  data_nascimento: '1990-10-10',
};

test('idade em anos considera o aniversário em UTC', () => {
  const hoje = new Date('2026-06-15T12:00:00Z');
  assert.equal(idadeEmAnos(new Date('2008-06-15'), hoje), 18);
  assert.equal(idadeEmAnos(new Date('2008-06-16'), hoje), 17);
  assert.equal(idadeEmAnos(new Date('2008-07-01'), hoje), 17);
  assert.equal(idadeEmAnos(new Date('1990-10-10'), hoje), 35);
});

test('adotante converte a data para Temporal.Instant e normaliza os campos', () => {
  const dados = aprovado(createAdotanteSchema, { ...adotante, id_adotante: 99, extra: 'x' });
  assert.ok(dados.data_nascimento instanceof Temporal.Instant);
  assert.equal(dados.data_nascimento.toString(), '1990-10-10T00:00:00Z');
  assert.equal(dados.cpf, '00000000001');
  assert.equal(dados.tipo_residencia, 'CASA');
  assert.equal('id_adotante' in dados, false);
  assert.equal('extra' in dados, false);
});

test('adotante: mensagens de data de nascimento (obrigatória, formato, impossível e menor de idade)', () => {
  const { data_nascimento, ...semData } = adotante;
  assert.deepEqual(erros(createAdotanteSchema, semData), [['data_nascimento', 'A data de nascimento é obrigatória']]);
  for (const invalida of ['20/07/1995', '1990-02-30', '2026-13-01', 'ontem', 20260101, null]) {
    assert.deepEqual(erros(createAdotanteSchema, { ...adotante, data_nascimento: invalida }), [['data_nascimento', 'Data inválida (use o formato AAAA-MM-DD)']], String(invalida));
  }
  assert.deepEqual(erros(createAdotanteSchema, { ...adotante, data_nascimento: haAnos(17) }), [['data_nascimento', 'O adotante deve ter pelo menos 18 anos']]);
  assert.deepEqual(erros(createAdotanteSchema, { ...adotante, data_nascimento: '2999-01-01' }), [['data_nascimento', 'O adotante deve ter pelo menos 18 anos']]);
  // Faltando um dia para os 18 anos ainda é menor; fazendo exatamente 18 é aceito.
  assert.equal(createAdotanteSchema.safeParse({ ...adotante, data_nascimento: haAnos(18, 1) }).success, false);
  assert.equal(createAdotanteSchema.safeParse({ ...adotante, data_nascimento: haAnos(18) }).success, true);
});

test('adotante: campos inválidos retornam um problema por campo, com mensagens em português', () => {
  const problemas = erros(createAdotanteSchema, {
    cpf: '123', nome: 'Al', endereco: ' ', tipo_residencia: 'HOTEL',
    possui_animais: 'false', quantidade_animais: -1, data_nascimento: '1990-10-10',
  });
  assert.deepEqual(problemas.map(([campo]) => campo).sort(), ['cpf', 'endereco', 'nome', 'possui_animais', 'quantidade_animais', 'tipo_residencia']);
  const mensagens = Object.fromEntries(problemas);
  assert.equal(mensagens.cpf, 'cpf deve conter 11 dígitos.');
  assert.equal(mensagens.nome, 'nome deve ter no mínimo 3 caracteres.');
  assert.equal(mensagens.tipo_residencia, 'tipo_residencia deve ser um de: CASA, APARTAMENTO, CHÁCARA, OUTRO.');
  assert.equal(mensagens.possui_animais, 'possui_animais deve ser true ou false.');
  assert.deepEqual(erros(createAdotanteSchema, undefined), [['', 'Envie um objeto JSON.']]);
  assert.deepEqual(erros(createAdotanteSchema, []), [['', 'Envie um objeto JSON.']]);
});

test('RN06: quantidade de animais coerente com possui_animais', () => {
  assert.equal(createAdotanteSchema.safeParse({ ...adotante, possui_animais: true, quantidade_animais: 2 }).success, true);
  assert.deepEqual(erros(createAdotanteSchema, { ...adotante, possui_animais: false, quantidade_animais: 1 }).map(([campo]) => campo), ['quantidade_animais']);
  assert.deepEqual(erros(createAdotanteSchema, { ...adotante, possui_animais: true, quantidade_animais: 0 }).map(([campo]) => campo), ['quantidade_animais']);
  assert.deepEqual(erros(createAdotanteSchema, { ...adotante, quantidade_animais: -1 }), [['quantidade_animais', 'quantidade_animais não pode ser negativa.']]);
  assert.deepEqual(erros(createAdotanteSchema, { ...adotante, quantidade_animais: 1.5 }), [['quantidade_animais', 'quantidade_animais deve ser um número inteiro.']]);
  assert.equal(coerenciaAnimaisSchema.safeParse({ possui_animais: false, quantidade_animais: 2 }).success, false);
});

test('atualização de adotante é parcial, exige um campo e rejeita campos desconhecidos', () => {
  assert.deepEqual(aprovado(updateAdotanteSchema, { endereco: ' Rua Nova ' }), { endereco: 'Rua Nova' });
  assert.ok(aprovado(updateAdotanteSchema, { data_nascimento: '1988-03-15' }).data_nascimento instanceof Temporal.Instant);
  assert.deepEqual(erros(updateAdotanteSchema, {}), [['', 'Informe ao menos um campo para atualizar.']]);
  assert.match(erros(updateAdotanteSchema, { id_adotante: 5 })[0][1], /Campos não permitidos: id_adotante\. Campos permitidos: cpf, nome/);
  assert.deepEqual(erros(updateAdotanteSchema, { data_nascimento: haAnos(10) }), [['data_nascimento', 'O adotante deve ter pelo menos 18 anos']]);
  assert.deepEqual(erros(updateAdotanteSchema, { nome: null }).map(([campo]) => campo), ['nome']);
});

test('instituição normaliza o CNPJ e trata a foto opcional', () => {
  const dados = aprovado(createInstituicaoSchema, { cnpj: '00.000.000/0000-01', razao_social: ' Abrigo ', endereco: 'Rua B' });
  assert.equal(dados.cnpj, '00000000000001');
  assert.equal(dados.razao_social, 'Abrigo');
  assert.equal(dados.foto, undefined);
  assert.equal(aprovado(updateInstituicaoSchema, { foto: null }).foto, null);
  assert.deepEqual(erros(createInstituicaoSchema, { cnpj: 1 }).find(([campo]) => campo === 'cnpj'), ['cnpj', 'cnpj deve ser um texto.']);
  assert.deepEqual(erros(createInstituicaoSchema, {}).map(([campo, mensagem]) => `${campo}: ${mensagem}`), [
    'cnpj: cnpj é obrigatório.', 'razao_social: razao_social é obrigatório.', 'endereco: endereco é obrigatório.',
  ]);
  assert.equal(createInstituicaoSchema.safeParse({ cnpj: '00000000000001', razao_social: 'a'.repeat(201), endereco: 'x' }).success, false);
});

test('animal: tipo em minúsculas, datas DATE, apelido opcional e instituição obrigatória', () => {
  const dados = aprovado(createAnimalSchema, { tipo: ' GATO ', id_instituicao: 1, data_nascimento: '2024-02-29', apelido: 'Mimi', id_animal: 9 });
  assert.equal(dados.tipo, 'gato');
  assert.equal(dados.data_nascimento, '2024-02-29');
  assert.equal(dados.apelido, 'Mimi');
  assert.equal('id_animal' in dados, false);
  assert.equal(aprovado(createAnimalSchema, { tipo: 'cachorro', id_instituicao: 1 }).apelido, undefined);
  assert.deepEqual(erros(createAnimalSchema, { tipo: 'gato' }), [['id_instituicao', 'id_instituicao é obrigatório.']]);
  for (const id of [0, -1, 1.5, '1', 2147483648]) {
    assert.deepEqual(erros(createAnimalSchema, { tipo: 'gato', id_instituicao: id }).map(([campo]) => campo), ['id_instituicao'], String(id));
  }
  for (const data_nascimento of ['2025-02-29', '2026-13-01', '16/11/2026', '0000-01-01', 20240101]) {
    assert.deepEqual(erros(createAnimalSchema, { tipo: 'gato', id_instituicao: 1, data_nascimento }).map(([campo]) => campo), ['data_nascimento'], String(data_nascimento));
  }
  assert.equal(aprovado(updateAnimalSchema, { data_nascimento: null, raca: 'Siamês' }).data_nascimento, null);
  assert.equal(updateAnimalSchema.safeParse({ tipo: 'a'.repeat(51) }).success, false);
  assert.equal(filtroTipoSchema.parse({ tipo: 'COELHO' }).tipo, 'coelho');
});

test('vacina e aplicação: texto, referências e data da dose', () => {
  assert.equal(createVacinaSchema.safeParse({ nome: 'V8' }).success, true);
  assert.equal(createVacinaSchema.safeParse({ nome: 'a'.repeat(151) }).success, false);
  assert.deepEqual(erros(createVacinaSchema, { nome: '   ' }), [['nome', 'nome não pode ser vazio.']]);
  assert.equal(createAnimalVacinaSchema.safeParse({ id_animal: 1, id_vacina: 2, data_aplicacao: '2026-04-10' }).success, true);
  assert.deepEqual(erros(createAnimalVacinaSchema, { id_animal: 1, id_vacina: 2 }), [['data_aplicacao', 'data_aplicacao é obrigatória.']]);
});

test('match nasce PENDENTE e só o status pode ser atualizado', () => {
  assert.deepEqual(aprovado(createMatchSchema, { id_adotante: 1, id_animal: 2, data_pedido: '2000-01-01', status: 'PENDENTE' }), { id_adotante: 1, id_animal: 2 });
  assert.deepEqual(erros(createMatchSchema, { id_adotante: 1, id_animal: 2, status: 'APROVADO' }), [['status', 'O status inicial deve ser PENDENTE.']]);
  assert.deepEqual(erros(createMatchSchema, { id_adotante: 1 }), [['id_animal', 'id_animal é obrigatório.']]);
  assert.equal(aprovado(updateMatchSchema, { status: 'em andamento' }).status, 'EM ANDAMENTO');
  assert.deepEqual(erros(updateMatchSchema, { status: 'FINALIZADO' }), [['status', 'status deve ser um de: PENDENTE, EM ANDAMENTO, APROVADO, CANCELADO.']]);
  assert.equal(updateMatchSchema.safeParse({ id_animal: 9 }).success, false);
  assert.equal(updateMatchSchema.safeParse({}).success, false);
});
