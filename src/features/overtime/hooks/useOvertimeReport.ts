import { useCallback, useMemo, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { gerarRelatorioHtml, tituloRelatorio, type ParametrosRelatorio, type VarianteRelatorio } from '../domain/relatorioHtml';
import { nomeRelatorio } from '../domain/nomeArquivo';
import { formatMin } from '../domain/tempo';
import type { LimitesFaixa } from '../domain/faixas';
import type { Lancamento } from '../domain/pontoTipos';
import type { FiltrosOvertime } from '../domain/filtros';
import { baixarTexto, imprimirHtml } from '../services/relatorioSaida';
import { registrarRelatorio, type ConfigRow, type ImportacaoRow } from '../services/overtimeApi';

const hojeBR = (): string => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

/**
 * Nota de conciliação do período, montada a partir das importações que o
 * cobrem. Ela vai impressa no relatório: sem isso, o leitor não teria como
 * saber se os números conferiram com o arquivo do Secullum.
 */
export function notaConciliacao(importacoes: ImportacaoRow[]): string | null {
  if (!importacoes.length) return null;
  const divergentes = importacoes.filter((i) => !i.conciliacao_ok);
  if (!divergentes.length) {
    return `Os ${importacoes.length === 1 ? 'dados foram conferidos' : `dados das ${importacoes.length} importações foram conferidos`} contra as linhas SUBTOTAL e TOTAL GERAL do arquivo de origem, sem divergência.`;
  }
  return `Atenção: ${divergentes.length} importação(ões) deste período foi(ram) gravada(s) com divergência em relação aos totais do arquivo de origem. Confira o Histórico antes de circular este documento.`;
}

export interface ParamsRelatorioHook {
  lancamentos: Lancamento[];
  filtros: FiltrosOvertime;
  descricaoFiltros: string[];
  limites: LimitesFaixa;
  departamentoUnico: string | null;
  importacoes: ImportacaoRow[];
  config: ConfigRow | null;
}

/** Geração, prévia e saída do relatório. */
export function useOvertimeReport(params: ParamsRelatorioHook) {
  const { toast } = useToast();
  const [variante, setVariante] = useState<VarianteRelatorio>('completo');
  const [previaAberta, setPreviaAberta] = useState(false);

  // As dependências são os CAMPOS, não o objeto `params`: a tela monta um
  // literal novo a cada render, e depender dele geraria o documento inteiro
  // (oito seções, centenas de linhas) a cada digitada na busca.
  const { lancamentos, filtros, descricaoFiltros, limites, departamentoUnico, importacoes, config } = params;

  const parametros = useMemo<ParametrosRelatorio>(() => ({
    variante,
    lancamentos,
    filtros,
    descricaoFiltros,
    limites,
    origem: {
      arquivoNome: importacoes[0]?.arquivo_nome ?? null,
      emitidoEm: hojeBR(),
      departamentos: new Set(lancamentos.map((l) => l.departamentoCodigo)).size,
    },
    departamentoUnico,
    logoUrl: config?.logo_url ?? null,
    rodape: config?.rodape ?? undefined,
    notaConciliacao: notaConciliacao(importacoes),
  }), [variante, lancamentos, filtros, descricaoFiltros, limites, departamentoUnico, importacoes, config]);

  // O documento é montado SOB DEMANDA. Gerá-lo a cada mudança de filtro, mesmo
  // com a prévia fechada, custaria centenas de linhas de HTML a cada digitada.
  const gerar = useCallback(() => gerarRelatorioHtml(parametros), [parametros]);
  const htmlPrevia = useMemo(() => (previaAberta ? gerar() : ''), [previaAberta, gerar]);

  const nomeBase = (extensao: 'pdf' | 'html') => nomeRelatorio({
    variante,
    inicio: filtros.inicio,
    fim: filtros.fim,
    departamentoUnico,
    extensao,
  });

  /** Registro de auditoria — falha aqui não pode impedir a entrega do arquivo. */
  const registrar = async (arquivoNome: string) => {
    try {
      await registrarRelatorio({
        tipo: variante,
        parametros: {
          filtros,
          limites,
          lancamentos: lancamentos.length,
          extras_min: lancamentos.reduce((s, l) => s + l.extrasMin, 0),
        },
        inicio: filtros.inicio,
        fim: filtros.fim,
        arquivoNome,
      });
    } catch {
      /* o relatório já foi entregue ao usuário; o log é secundário */
    }
  };

  const semDados = lancamentos.length === 0;

  const baixarHtml = async () => {
    if (semDados) return avisarVazio();
    const nome = nomeBase('html');
    baixarTexto(gerar(), nome);
    await registrar(nome);
  };

  const baixarPdf = async () => {
    if (semDados) return avisarVazio();
    const nome = nomeBase('pdf');
    if (imprimirHtml(gerar()) === 'bloqueado') {
      toast({
        title: 'O navegador bloqueou a janela de impressão',
        description: 'Libere as janelas pop-up para este site, ou baixe o HTML e imprima por ele.',
        variant: 'destructive',
      });
      return;
    }
    toast({
      title: 'Janela de impressão aberta',
      description: `Escolha "Salvar como PDF" e mantenha o nome sugerido: ${nome}`,
    });
    await registrar(nome);
  };

  function avisarVazio() {
    toast({
      title: 'Nada para gerar',
      description: 'O recorte selecionado não tem nenhum lançamento. Ajuste o período ou os filtros.',
      variant: 'destructive',
    });
  }

  const titulo = tituloRelatorio({ variante, departamentoUnico });
  const totalExtras = formatMin(lancamentos.reduce((s, l) => s + l.extrasMin, 0));

  return {
    variante, setVariante,
    html: htmlPrevia, titulo, totalExtras, semDados,
    previaAberta, setPreviaAberta,
    nomeSugerido: nomeBase('pdf'),
    baixarHtml, baixarPdf,
  };
}
