export interface MatchProcessado {
  id_match: number;
  id_adotante: number;
  id_animal: number;
  status: string;
}

interface ResultadoEtapa { match: MatchProcessado; mensagem: string }
export interface EtapasAdocao {
  receber(): Promise<ResultadoEtapa>;
  analisar(match: MatchProcessado): Promise<ResultadoEtapa>;
  concluir(match: MatchProcessado): Promise<ResultadoEtapa>;
}
export interface OpcoesFluxo {
  falharNaAnalise?: boolean;
  registrar?: (mensagem: string) => void;
  registrarErro?: (mensagem: string) => void;
}

function aguardar(milissegundos: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milissegundos));
}

// O encadeamento controla as esperas; as ações são os serviços do sistema.
export function processarEtapasAdocao(etapas: EtapasAdocao, {
  falharNaAnalise = false,
  registrar = console.log,
  registrarErro = console.error,
}: OpcoesFluxo = {}): Promise<MatchProcessado | null> {
  let match: MatchProcessado;
  function guardar(resultado: ResultadoEtapa): string {
    match = resultado.match;
    return resultado.mensagem;
  }
  function receberSolicitacao() {
    return aguardar(2000).then(() => etapas.receber()).then(guardar);
  }
  function analisarSolicitacao() {
    return aguardar(3000).then(() => {
      if (falharNaAnalise) throw new Error('Erro ao analisar a solicitação de adoção.');
      return etapas.analisar(match);
    }).then(guardar);
  }
  function concluirAdocao() {
    return aguardar(4000).then(() => etapas.concluir(match)).then(guardar);
  }

  return receberSolicitacao()
    .then((mensagem) => {
      registrar(mensagem);
      return analisarSolicitacao();
    })
    .then((mensagem) => {
      registrar(mensagem);
      return concluirAdocao();
    })
    .then((mensagem) => {
      registrar(mensagem);
      registrar('Solicitação de adoção processada com sucesso.');
      return match;
    })
    .catch((erro: unknown) => {
      registrarErro(`Processo interrompido: ${erro instanceof Error ? erro.message : String(erro)}`);
      // Uma falha técnica preserva o último status persistido.
      return null;
    });
}
