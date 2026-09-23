import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  aplicarFiltros, descreverFiltros, periodoDoAtalho, temFiltroAtivo,
  FILTROS_VAZIOS, type AtalhoPeriodo, type FiltrosOvertime,
} from '../domain/filtros';
import {
  anexoQuadroCompleto, detalheOcorrencias, matrizDepartamentoDia,
  porDepartamento, porDia, rankingFuncionarios, resumoExecutivo,
} from '../domain/agregacoes';
import { calcularAlertas } from '../domain/alertas';
import { rotuloDepartamento } from '../domain/departamentos';
import type { LimitesFaixa } from '../domain/faixas';
import type { Lancamento } from '../domain/pontoTipos';
import { listarLancamentos, importacoesDoPeriodo, type ImportacaoRow } from '../services/overtimeApi';

/**
 * Dados do painel e dos relatórios.
 *
 * Divisão de trabalho: o PERÍODO é recortado no servidor (é o que limita o
 * volume e a exposição de dado pessoal); os demais filtros são aplicados sobre
 * o que já veio, para o painel responder na hora ao mexer em um interruptor.
 */
export function useOvertimeData(limites: LimitesFaixa, rotulos: Map<string, string>) {
  const { toast } = useToast();
  const hoje = useMemo(() => new Date(), []);
  const inicial = useMemo(() => periodoDoAtalho('ontem', hoje), [hoje]);

  const [filtros, setFiltros] = useState<FiltrosOvertime>({ ...FILTROS_VAZIOS, ...inicial });
  const [brutos, setBrutos] = useState<Lancamento[]>([]);
  const [importacoes, setImportacoes] = useState<ImportacaoRow[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const { inicio, fim } = filtros;

  const carregar = useCallback(async () => {
    if (!inicio || !fim) return;
    setCarregando(true);
    setErro(null);
    try {
      const [lancs, imps] = await Promise.all([
        listarLancamentos(inicio, fim),
        importacoesDoPeriodo(inicio, fim),
      ]);
      // O rótulo cadastrado pelo administrador vence o mapa padrão.
      setBrutos(lancs.map((l) => ({
        ...l,
        departamentoNome: rotulos.get(l.departamentoCodigo) ?? l.departamentoNome ?? rotuloDepartamento(l.departamentoCodigo),
      })));
      setImportacoes(imps);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Falha ao consultar o período.';
      setErro(msg);
      toast({ title: 'Não foi possível carregar o período', description: msg, variant: 'destructive' });
    } finally {
      setCarregando(false);
    }
  }, [inicio, fim, rotulos, toast]);

  useEffect(() => { void carregar(); }, [carregar]);

  const lancamentos = useMemo(() => aplicarFiltros(brutos, filtros), [brutos, filtros]);

  /** Departamentos presentes no período — alimenta o seletor do filtro. */
  const departamentosDoPeriodo = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const l of brutos) mapa.set(l.departamentoCodigo, l.departamentoNome);
    return [...mapa].map(([codigo, nome]) => ({ codigo, nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [brutos]);

  const painel = useMemo(() => ({
    resumo: resumoExecutivo(lancamentos),
    departamentos: porDepartamento(lancamentos),
    dias: porDia(lancamentos),
    matriz: matrizDepartamentoDia(lancamentos),
    ranking: rankingFuncionarios(lancamentos),
    detalhe: detalheOcorrencias(lancamentos),
    anexo: anexoQuadroCompleto(lancamentos),
  }), [lancamentos]);

  const alertas = useMemo(() => calcularAlertas(lancamentos, {
    limites,
    importacoesComDivergencia: importacoes
      .filter((i) => !i.conciliacao_ok)
      .map((i) => ({ dataInicio: i.data_referencia_inicio, dataFim: i.data_referencia_fim })),
  }), [lancamentos, limites, importacoes]);

  const descricaoFiltros = useMemo(
    () => descreverFiltros(filtros, (c) => rotulos.get(c) ?? rotuloDepartamento(c)),
    [filtros, rotulos],
  );

  /** Quando o recorte é de um único departamento, o relatório diz qual. */
  const departamentoUnico = useMemo(() => {
    const nomes = new Set(lancamentos.map((l) => l.departamentoNome));
    return nomes.size === 1 ? [...nomes][0] : null;
  }, [lancamentos]);

  const aplicarAtalho = (atalho: AtalhoPeriodo) =>
    setFiltros((f) => ({ ...f, ...periodoDoAtalho(atalho, hoje) }));

  const limparFiltros = () =>
    setFiltros((f) => ({ ...FILTROS_VAZIOS, inicio: f.inicio, fim: f.fim }));

  return {
    filtros, setFiltros, aplicarAtalho, limparFiltros,
    temFiltroAtivo: temFiltroAtivo(filtros),
    brutos, lancamentos, departamentosDoPeriodo, importacoes,
    painel, alertas, descricaoFiltros, departamentoUnico,
    carregando, erro, recarregar: carregar,
  };
}
