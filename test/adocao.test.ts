import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { processarEtapasAdocao, type EtapasAdocao, type OpcoesFluxo } from '../src/modules/match/adocao.fluxo';

function preparar(t: TestContext, substituicoes: Partial<EtapasAdocao> = {}, opcoes: OpcoesFluxo = {}) {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const chamadas: string[] = [];
  const mensagens: string[] = [];
  const erros: string[] = [];
  const match = { id_match: 1, id_adotante: 1, id_animal: 1, status: 'PENDENTE' };
  const etapas: EtapasAdocao = {
    receber: async () => { chamadas.push('receber'); return { match, mensagem: 'Recebida' }; },
    analisar: async (atual) => { chamadas.push('analisar'); return { match: { ...atual, status: 'EM ANDAMENTO' }, mensagem: 'Analisada' }; },
    concluir: async (atual) => { chamadas.push('concluir'); return { match: { ...atual, status: 'APROVADO' }, mensagem: 'Concluída' }; },
    ...substituicoes,
  };
  const resultado = processarEtapasAdocao(etapas, {
    registrar: (mensagem) => mensagens.push(mensagem),
    registrarErro: (mensagem) => erros.push(mensagem),
    ...opcoes,
  });
  return { chamadas, mensagens, erros, resultado };
}

async function avancar(t: TestContext, tempo: number) {
  t.mock.timers.tick(tempo);
  await new Promise<void>((resolve) => setImmediate(resolve));
}

test('Promises aguardam 2, 3 e 4 segundos e executam as etapas em sequência', async (t) => {
  const { chamadas, mensagens, erros, resultado } = preparar(t);
  await avancar(t, 1999);
  assert.deepEqual(chamadas, []);
  await avancar(t, 1);
  assert.deepEqual(chamadas, ['receber']);
  await avancar(t, 2999);
  assert.deepEqual(chamadas, ['receber']);
  await avancar(t, 1);
  assert.deepEqual(chamadas, ['receber', 'analisar']);
  await avancar(t, 3999);
  assert.equal(chamadas.length, 2);
  await avancar(t, 1);
  assert.equal((await resultado)?.status, 'APROVADO');
  assert.deepEqual(chamadas, ['receber', 'analisar', 'concluir']);
  assert.deepEqual(mensagens.slice(0, 3), ['Recebida', 'Analisada', 'Concluída']);
  assert.equal(mensagens.length, 4);
  assert.deepEqual(erros, []);
});

test('erro demonstrativo na análise passa pelo catch e interrompe o fluxo', async (t) => {
  const { chamadas, mensagens, erros, resultado } = preparar(t, {}, { falharNaAnalise: true });
  await avancar(t, 2000);
  await avancar(t, 3000);
  assert.equal(await resultado, null);
  await avancar(t, 10000);
  assert.deepEqual(chamadas, ['receber']);
  assert.deepEqual(mensagens, ['Recebida']);
  assert.match(erros[0], /Erro ao analisar/);
});

test('rejeição do recebimento não executa as etapas seguintes', async (t) => {
  const { chamadas, mensagens, erros, resultado } = preparar(t, {
    receber: async () => { throw new Error('Animal indisponível'); },
  });
  await avancar(t, 2000);
  assert.equal(await resultado, null);
  await avancar(t, 10000);
  assert.deepEqual(chamadas, []);
  assert.deepEqual(mensagens, []);
  assert.match(erros[0], /Animal indisponível/);
});

test('rejeição do serviço de análise impede a conclusão', async (t) => {
  const { chamadas, erros, resultado } = preparar(t, {
    analisar: async () => { throw new Error('Dados incoerentes'); },
  });
  await avancar(t, 2000);
  await avancar(t, 3000);
  assert.equal(await resultado, null);
  assert.deepEqual(chamadas, ['receber']);
  assert.match(erros[0], /Dados incoerentes/);
});

test('rejeição da conclusão não registra sucesso', async (t) => {
  const { mensagens, erros, resultado } = preparar(t, {
    concluir: async () => { throw new Error('Outra solicitação já foi aprovada'); },
  });
  await avancar(t, 2000);
  await avancar(t, 3000);
  await avancar(t, 4000);
  assert.equal(await resultado, null);
  assert.deepEqual(mensagens, ['Recebida', 'Analisada']);
  assert.match(erros[0], /já foi aprovada/);
});
