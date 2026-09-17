import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getMovimentacoesDetalhadas, type MovDetalhada } from '../services/inventoryApi';
import { mesRefRange } from '../domain/movementPeriod';
import { useFardamentos } from './useFardamentos';
import { periodoRange, type Periodo } from '../components/dashboard/derive';
import { direcaoMov, totalPecas, type Direcao } from '../components/movements/movementMeta';

const JANELA = 500;
/** Um mês fechado é consultado no servidor, então cabe uma janela maior. */
const JANELA_MES = 2000;
const norm = (s: string) => (s ?? '').toLocaleLowerCase('pt-BR').normalize('NFD').replace(/\p{Diacritic}/gu, '');

export type Ordenacao = 'recentes' | 'antigas' | 'maior_qtd' | 'numero' | 'tipo';
export type Agrupamento = 'lista' | 'tipo' | 'unidade' | 'item' | 'responsavel';
export interface MovFiltros {
  /** 'mes_ref' = mês/ano escolhido em `mesRef` (consultado no servidor). */
  periodo: Periodo | 'todos' | 'mes_ref';
  /** Competência 'YYYY-MM' quando `periodo === 'mes_ref'`. */
  mesRef: string;
  tipo: string; direcao: Direcao | ''; unidadeId: string; origem: string;
  varianteId: string; categoria: string; responsavel: string; comNf: boolean; comObs: boolean;
}
const FVAZIO: MovFiltros = { periodo: '30d', mesRef: '', tipo: '', direcao: '', unidadeId: '', origem: '', varianteId: '', categoria: '', responsavel: '', comNf: false, comObs: false };

export interface VarInfo { nome: string; codigo: string; tamanho: string | null; categoria: string | null; custo: number }

export function useInventoryMovements() {
  const { fardamentos, unidades } = useFardamentos();
  const [movs, setMovs] = useState<MovDetalhada[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [atualizadoEm, setAtualizadoEm] = useState(() => new Date());
  const mounted = useRef(true);

  const [filtros, setFiltros] = useState<MovFiltros>(FVAZIO);
  const [buscaRaw, setBuscaRaw] = useState(''); const [busca, setBusca] = useState('');
  const [ordenacao, setOrdenacao] = useState<Ordenacao>('recentes');
  const [agrupamento, setAgrupamento] = useState<Agrupamento>('lista');
  const [page, setPage] = useState(1); const [pageSize, setPageSize] = useState(25);

  useEffect(() => { const t = setTimeout(() => { setBusca(buscaRaw); setPage(1); }, 350); return () => clearTimeout(t); }, [buscaRaw]);

  // Mês fechado selecionado -> a faixa vai para a CONSULTA, não só para o filtro
  // em memória. Sem isso, um mês anterior às 500 mais recentes viria vazio.
  const mesRange = useMemo(
    () => (filtros.periodo === 'mes_ref' ? mesRefRange(filtros.mesRef) : null),
    [filtros.periodo, filtros.mesRef],
  );

  const carregar = useCallback(async () => {
    try {
      setLoading(true); setError(false);
      const rows = mesRange
        ? await getMovimentacoesDetalhadas(JANELA_MES, mesRange)
        : await getMovimentacoesDetalhadas(JANELA);
      if (!mounted.current) return;
      setMovs(rows); setAtualizadoEm(new Date());
    }
    catch (e) { console.error('Erro ao carregar movimentações:', e); if (mounted.current) setError(true); }
    finally { if (mounted.current) setLoading(false); }
  }, [mesRange]);
  useEffect(() => { mounted.current = true; carregar(); return () => { mounted.current = false; }; }, [carregar]);

  const varInfo = useMemo(() => {
    const m = new Map<string, VarInfo>();
    for (const f of fardamentos) m.set(f.variante.id, { nome: f.variante.nome, codigo: f.variante.codigo_interno, tamanho: f.tamanhoRotulo, categoria: f.categoriaNome, custo: f.variante.custo_unitario ?? 0 });
    return m;
  }, [fardamentos]);
  const unidadeNome = useMemo(() => new Map(unidades.map((u) => [u.id, u.nome])), [unidades]);
  const custoDe = useCallback((vid: string) => varInfo.get(vid)?.custo ?? 0, [varInfo]);

  const range = useMemo(() => {
    if (filtros.periodo === 'todos') return null;
    if (filtros.periodo === 'mes_ref') return mesRange;   // mesma faixa da consulta
    return periodoRange(filtros.periodo, atualizadoEm);
  }, [filtros.periodo, mesRange, atualizadoEm]);

  const filtradas = useMemo(() => {
    const q = norm(busca.trim());
    const arr = movs.filter((m) => {
      if (range) { const t = new Date(m.createdAt).getTime(); if (t < range.inicio.getTime() || t >= range.fim.getTime()) return false; }
      if (filtros.tipo && m.tipo !== filtros.tipo) return false;
      if (filtros.direcao && direcaoMov(m) !== filtros.direcao) return false;
      if (filtros.unidadeId && m.unidadeId !== filtros.unidadeId) return false;
      if (filtros.origem && (m.referenciaTipo ?? '') !== filtros.origem) return false;
      if (filtros.responsavel && m.operadorNome !== filtros.responsavel) return false;
      if (filtros.comNf && !m.documento) return false;
      if (filtros.comObs && !m.observacao) return false;
      if (filtros.varianteId && !m.itens.some((i) => i.varianteId === filtros.varianteId)) return false;
      if (filtros.categoria && !m.itens.some((i) => varInfo.get(i.varianteId)?.categoria === filtros.categoria)) return false;
      if (q) {
        const alvo = norm([m.numero, m.observacao ?? '', unidadeNome.get(m.unidadeId) ?? '', m.operadorNome, ...m.itens.map((i) => `${varInfo.get(i.varianteId)?.nome ?? ''} ${varInfo.get(i.varianteId)?.codigo ?? ''}`)].join(' '));
        if (!alvo.includes(q)) return false;
      }
      return true;
    });
    arr.sort((a, b) => {
      switch (ordenacao) {
        case 'antigas': return a.createdAt < b.createdAt ? -1 : 1;
        case 'maior_qtd': return totalPecas(b) - totalPecas(a);
        case 'numero': return a.numero.localeCompare(b.numero, 'pt-BR');
        case 'tipo': return a.tipo.localeCompare(b.tipo);
        default: return a.createdAt < b.createdAt ? 1 : -1;
      }
    });
    return arr;
  }, [movs, busca, filtros, range, varInfo, unidadeNome, ordenacao]);

  const stats = useMemo(() => {
    let entradas = 0, saidas = 0, ajustes = 0, estornos = 0, pecas = 0;
    for (const m of filtradas) {
      const d = direcaoMov(m); pecas += totalPecas(m);
      if (m.tipo.startsWith('AJUSTE')) ajustes++; else if (m.tipo.startsWith('ESTORNO')) estornos++;
      if (d === 'IN') entradas++; else if (d === 'OUT') saidas++;
    }
    return { total: filtradas.length, entradas, saidas, ajustes, estornos, pecas };
  }, [filtradas]);

  const fluxo = useMemo(() => {
    let pecasIn = 0, pecasOut = 0; const porUnid = new Map<string, number>(); const porItem = new Map<string, number>();
    for (const m of filtradas) for (const it of m.itens) {
      if (it.direcao === 'IN') pecasIn += it.quantidade; else pecasOut += it.quantidade;
      porUnid.set(m.unidadeId, (porUnid.get(m.unidadeId) ?? 0) + it.quantidade);
      porItem.set(it.varianteId, (porItem.get(it.varianteId) ?? 0) + it.quantidade);
    }
    const topUnid = [...porUnid.entries()].sort((a, b) => b[1] - a[1])[0];
    const topItem = [...porItem.entries()].sort((a, b) => b[1] - a[1])[0];
    return { pecasIn, pecasOut, liquido: pecasIn - pecasOut, operacoes: filtradas.length, unidadeMais: topUnid ? (unidadeNome.get(topUnid[0]) ?? '—') : null, itemMais: topItem ? (varInfo.get(topItem[0])?.nome ?? '—') : null };
  }, [filtradas, unidadeNome, varInfo]);

  const operacaoMap = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const mv of movs) if (mv.operacaoId) { const a = m.get(mv.operacaoId) ?? []; a.push(mv.id); m.set(mv.operacaoId, a); }
    return m;
  }, [movs]);

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / pageSize));
  const pagina = useMemo(() => filtradas.slice((page - 1) * pageSize, page * pageSize), [filtradas, page, pageSize]);
  useEffect(() => { if (page > totalPaginas) setPage(1); }, [page, totalPaginas]);

  const opcoes = useMemo(() => ({
    tipos: [...new Set(movs.map((m) => m.tipo))],
    origens: [...new Set(movs.map((m) => m.referenciaTipo).filter(Boolean) as string[])],
    responsaveis: [...new Set(movs.map((m) => m.operadorNome).filter((n) => n && n !== '—'))].sort(),
    unidades: unidades.map((u) => ({ id: u.id, nome: u.nome })),
    categorias: [...new Set(fardamentos.map((f) => f.categoriaNome).filter(Boolean) as string[])].sort(),
    variantes: fardamentos.map((f) => ({ id: f.variante.id, nome: `${f.variante.nome} (${f.variante.codigo_interno})` })),
  }), [movs, unidades, fardamentos]);

  const setFiltro = <K extends keyof MovFiltros>(k: K, v: MovFiltros[K]) => {
    // Trocar de período por outro caminho abandona o mês fechado, para a interface
    // não ficar com um chip aceso e um mês invisível competindo entre si.
    setFiltros((p) => ({ ...p, [k]: v, ...(k === 'periodo' && v !== 'mes_ref' ? { mesRef: '' } : null) }));
    setPage(1);
  };

  /** Seleciona um mês fechado (dispara consulta no servidor). */
  const setMesRef = (mesRef: string) => { setFiltros((p) => ({ ...p, periodo: 'mes_ref', mesRef })); setPage(1); };
  const limpar = () => { setFiltros(FVAZIO); setBuscaRaw(''); setPage(1); };

  return {
    loading, error, refetch: carregar, atualizadoEm, janela: JANELA, totalCarregado: movs.length,
    filtros, buscaRaw, setBusca: setBuscaRaw, setFiltro, setMesRef, mesRange, limpar, ordenacao, setOrdenacao, agrupamento, setAgrupamento,
    filtradas, pagina, page, setPage, pageSize, setPageSize, totalPaginas,
    stats, fluxo, opcoes, operacaoMap, varInfo, unidadeNome, custoDe, movs,
  };
}
