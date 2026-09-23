// Filtros do painel e dos relatórios — PURO.
//
// Um filtro só. Painel e relatório aplicam exatamente a mesma função, senão a
// tela e o PDF dariam números diferentes com os mesmos parâmetros na tela.

import { formatMin } from './tempo';
import { FAIXA_LABEL, type Faixa } from './faixas';
import { dataBR, diaDaSemana } from './agregacoes';
import type { Lancamento } from './pontoTipos';

export interface FiltrosOvertime {
  /** Datas ISO inclusivas. */
  inicio: string;
  fim: string;
  /** Códigos de departamento. Vazio = todos. */
  departamentos: string[];
  /** Busca por nome ou matrícula. */
  busca: string;
  /** Faixas aceitas. Vazio = todas. */
  faixas: Faixa[];
  /** Só ocorrências acima do limite de referência. */
  somenteAcimaDoLimite: boolean;
  /** Extra mínimo em minutos. 0 = sem piso. */
  minimoExtraMin: number;
  /** Dias da semana aceitos (0 = domingo). Vazio = todos. */
  diasDaSemana: number[];
}

export const FILTROS_VAZIOS: FiltrosOvertime = {
  inicio: '',
  fim: '',
  departamentos: [],
  busca: '',
  faixas: [],
  somenteAcimaDoLimite: false,
  minimoExtraMin: 0,
  diasDaSemana: [],
};

const normalizar = (s: string): string =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

/**
 * O período NÃO é aplicado aqui: ele é aplicado na consulta ao banco, para não
 * trazer o histórico inteiro para o navegador. Esta função filtra o que já veio.
 */
export function aplicarFiltros(lancs: Lancamento[], f: FiltrosOvertime): Lancamento[] {
  const deps = new Set(f.departamentos);
  const faixas = new Set(f.faixas);
  const semana = new Set(f.diasDaSemana);
  const busca = normalizar(f.busca.trim());

  return lancs.filter((l) => {
    if (deps.size && !deps.has(l.departamentoCodigo)) return false;
    if (faixas.size && !faixas.has(l.faixa)) return false;
    if (f.somenteAcimaDoLimite && l.faixa !== 'amarelo' && l.faixa !== 'vermelho') return false;
    if (f.minimoExtraMin > 0 && l.extrasMin < f.minimoExtraMin) return false;
    if (semana.size && !semana.has(diaDaSemana(l.data))) return false;
    if (busca && !normalizar(l.nome).includes(busca) && !l.matricula.includes(f.busca.trim())) return false;
    return true;
  });
}

/** Há algum filtro além do período? */
export function temFiltroAtivo(f: FiltrosOvertime): boolean {
  return f.departamentos.length > 0
    || f.faixas.length > 0
    || f.somenteAcimaDoLimite
    || f.minimoExtraMin > 0
    || f.diasDaSemana.length > 0
    || f.busca.trim() !== '';
}

const NOME_DIA_FILTRO = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

/**
 * Descrição textual dos filtros — vai para os chips da tela E para o cabeçalho
 * do relatório. Sem isso, dois relatórios com totais diferentes pareceriam
 * contraditórios em vez de apenas recortados de outra forma.
 */
export function descreverFiltros(
  f: FiltrosOvertime,
  rotuloDepartamento: (codigo: string) => string = (c) => c,
): string[] {
  const partes: string[] = [];
  if (f.departamentos.length) {
    partes.push(`Departamentos: ${f.departamentos.map(rotuloDepartamento).join(', ')}`);
  }
  if (f.busca.trim()) partes.push(`Busca: "${f.busca.trim()}"`);
  if (f.faixas.length) partes.push(`Faixas: ${f.faixas.map((x) => FAIXA_LABEL[x]).join(', ')}`);
  if (f.somenteAcimaDoLimite) partes.push('Somente ocorrências acima do limite');
  if (f.minimoExtraMin > 0) partes.push(`Extra mínimo: ${formatMin(f.minimoExtraMin)}`);
  if (f.diasDaSemana.length) {
    partes.push(`Dias da semana: ${f.diasDaSemana.map((d) => NOME_DIA_FILTRO[d]).join(', ')}`);
  }
  return partes;
}

/** Rótulo do período: dia único ou intervalo. */
export function rotuloPeriodo(inicio: string, fim: string): string {
  if (!inicio && !fim) return 'Período não informado';
  if (inicio === fim) return dataBR(inicio);
  return `${dataBR(inicio)} a ${dataBR(fim)}`;
}

// ---------------------------------------------------------------- atalhos

export type AtalhoPeriodo = 'ontem' | 'ultimos7' | 'semana_atual' | 'mes_atual';

export const ATALHO_LABEL: Record<AtalhoPeriodo, string> = {
  ontem: 'Ontem',
  ultimos7: 'Últimos 7 dias',
  semana_atual: 'Semana atual',
  mes_atual: 'Mês atual',
};

const iso = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Resolve um atalho para [inicio, fim] em ISO. `hoje` é injetável (testável). */
export function periodoDoAtalho(atalho: AtalhoPeriodo, hoje: Date = new Date()): { inicio: string; fim: string } {
  const base = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

  if (atalho === 'ontem') {
    const d = new Date(base);
    d.setDate(d.getDate() - 1);
    return { inicio: iso(d), fim: iso(d) };
  }
  if (atalho === 'ultimos7') {
    const d = new Date(base);
    d.setDate(d.getDate() - 6);
    return { inicio: iso(d), fim: iso(base) };
  }
  if (atalho === 'semana_atual') {
    // Semana comercial da Concrem: segunda a sábado.
    const d = new Date(base);
    const offset = (d.getDay() + 6) % 7;      // 0 = segunda
    d.setDate(d.getDate() - offset);
    return { inicio: iso(d), fim: iso(base) };
  }
  return { inicio: iso(new Date(base.getFullYear(), base.getMonth(), 1)), fim: iso(base) };
}
