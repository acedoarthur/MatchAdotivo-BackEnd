import type { Database } from '../../prisma/db';
import { encontrado } from '../../shared/validacao';
import { coerenciaAnimaisSchema } from '../adotante/adotante.schema';
import { APROVADO, EM_ANDAMENTO, type CreateMatchDTO } from './match.types';
import { criarMatch, alterarStatusMatch } from './match.service';
import { processarEtapasAdocao, type OpcoesFluxo } from './adocao.fluxo';

export function processarAdocao(db: Database, dados: CreateMatchDTO, opcoes: OpcoesFluxo = {}) {
  return processarEtapasAdocao({
    receber: async () => {
      const match = await criarMatch(db, dados);
      const adotante = encontrado(await db.orm.public.Adotante.where({ id_adotante: match.id_adotante }).first());
      const animal = encontrado(await db.orm.public.Animal.where({ id_animal: match.id_animal }).first());
      const instituicao = encontrado(await db.orm.public.Instituicao.where({ id_instituicao: animal.id_instituicao }).first());
      return { match, mensagem: `Solicitação recebida. Match #${match.id_match}: ${adotante.nome}, animal #${animal.id_animal} (${animal.tipo}), instituição ${instituicao.razao_social}. Status: PENDENTE.` };
    },
    analisar: async (atual) => {
      const adotante = encontrado(await db.orm.public.Adotante.where({ id_adotante: atual.id_adotante }).first());
      const coerencia = coerenciaAnimaisSchema.safeParse(adotante);
      if (!coerencia.success) throw new Error(coerencia.error.issues[0]?.message ?? 'Dados do adotante incoerentes.');
      const doses = await db.orm.public.AnimalVacina.where({ id_animal: atual.id_animal }).include('vacina').all();
      const historico = doses.map((dose) => `${dose.vacina.nome} em ${dose.data_aplicacao}`).join('; ');
      const match = await alterarStatusMatch(db, atual.id_match, EM_ANDAMENTO);
      return { match, mensagem: `Solicitação analisada. Status: EM ANDAMENTO. Histórico de vacinação: ${historico || 'nenhuma aplicação registrada'}.` };
    },
    concluir: async (atual) => {
      const match = await alterarStatusMatch(db, atual.id_match, APROVADO);
      return { match, mensagem: `Adoção concluída. Match #${match.id_match}. Status: APROVADO.` };
    },
  }, opcoes);
}
