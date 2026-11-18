import type { Database } from '../../prisma/db';
import { adotanteService } from '../adotante/adotante.service';
import { coerenciaAnimaisSchema } from '../adotante/adotante.schema';
import { animalService } from '../animal/animal.service';
import { instituicaoService } from '../instituicao/instituicao.service';
import { APROVADO, EM_ANDAMENTO, type CreateMatchDTO } from './match.types';
import { matchService } from './match.service';
import { processarEtapasAdocao, type OpcoesFluxo } from './adocao.fluxo';

// Fluxo de adoção com Promises: cada etapa reutiliza os services (e, por meio deles, os repositories).
export function processarAdocao(db: Database, dados: CreateMatchDTO, opcoes: OpcoesFluxo = {}) {
  const matches = matchService(db);
  const adotantes = adotanteService(db);
  const animais = animalService(db);
  const instituicoes = instituicaoService(db);
  return processarEtapasAdocao({
    receber: async () => {
      const match = await matches.create(dados);
      const adotante = await adotantes.findById(match.id_adotante);
      const animal = await animais.findById(match.id_animal);
      const instituicao = await instituicoes.findById(animal.id_instituicao);
      return { match, mensagem: `Solicitação recebida. Match #${match.id_match}: ${adotante.nome}, animal #${animal.id_animal} (${animal.tipo}), instituição ${instituicao.razao_social}. Status: PENDENTE.` };
    },
    analisar: async (atual) => {
      const adotante = await adotantes.findById(atual.id_adotante);
      const coerencia = coerenciaAnimaisSchema.safeParse(adotante);
      if (!coerencia.success) throw new Error(coerencia.error.issues[0]?.message ?? 'Dados do adotante incoerentes.');
      const doses = await animais.findVacinas(atual.id_animal);
      const historico = doses.map((dose) => `${dose.vacina.nome} em ${dose.data_aplicacao}`).join('; ');
      const match = await matches.updateStatus(atual.id_match, EM_ANDAMENTO);
      return { match, mensagem: `Solicitação analisada. Status: EM ANDAMENTO. Histórico de vacinação: ${historico || 'nenhuma aplicação registrada'}.` };
    },
    concluir: async (atual) => {
      const match = await matches.updateStatus(atual.id_match, APROVADO);
      return { match, mensagem: `Adoção concluída. Match #${match.id_match}. Status: APROVADO.` };
    },
  }, opcoes);
}
