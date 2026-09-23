// Alertas automáticos — PURO.
//
// Alerta NUNCA altera dado: ele aponta para um lançamento que já está gravado
// exatamente como veio do Secullum. É leitura, não correção.

import { formatMin } from './tempo';
import { ehAprendizes } from './departamentos';
import { LIMITES_PADRAO, type LimitesFaixa } from './faixas';
import { dataBR } from './agregacoes';
import type { Lancamento } from './pontoTipos';

export type TipoAlerta = 'limite_legal' | 'aprendiz' | 'reincidencia' | 'conciliacao';

export type GravidadeAlerta = 'alta' | 'media';

export interface Alerta {
  tipo: TipoAlerta;
  gravidade: GravidadeAlerta;
  titulo: string;
  detalhe: string;
  /** Quantos lançamentos/funcionários o alerta abrange. */
  quantidade: number;
}

export const TIPO_ALERTA_LABEL: Record<TipoAlerta, string> = {
  limite_legal: 'Acima do limite legal',
  aprendiz: 'Hora extra de aprendiz',
  reincidencia: 'Reincidência no período',
  conciliacao: 'Divergência de conciliação',
};

/** A partir de quantos dias com ocorrência o funcionário vira reincidente. */
export const DIAS_PARA_REINCIDENCIA = 3;

export interface OpcoesAlertas {
  limites?: LimitesFaixa;
  /** Importações do período que não conciliaram com o arquivo de origem. */
  importacoesComDivergencia?: { dataInicio: string; dataFim: string }[];
}

/**
 * Alertas do conjunto filtrado.
 *
 * O alerta de aprendiz dispara com QUALQUER extra acima de zero — a jornada de
 * aprendiz não admite hora extra, então nem a faixa verde é aceitável ali.
 */
export function calcularAlertas(lancs: Lancamento[], opcoes: OpcoesAlertas = {}): Alerta[] {
  const limites = opcoes.limites ?? LIMITES_PADRAO;
  const alertas: Alerta[] = [];

  const vermelhas = lancs.filter((l) => l.extrasMin > limites.amareloMaxMin);
  if (vermelhas.length) {
    const pior = vermelhas.reduce((a, b) => (b.extrasMin > a.extrasMin ? b : a));
    alertas.push({
      tipo: 'limite_legal',
      gravidade: 'alta',
      titulo: `${vermelhas.length} ocorrência(s) acima de ${formatMin(limites.amareloMaxMin)}`,
      detalhe: `Maior valor: ${formatMin(pior.extrasMin)} — ${pior.nome} (${pior.departamentoNome}), ${dataBR(pior.data)}.`,
      quantidade: vermelhas.length,
    });
  }

  const aprendizes = lancs.filter((l) => l.extrasMin > 0 && ehAprendizes(l.departamentoCodigo));
  if (aprendizes.length) {
    alertas.push({
      tipo: 'aprendiz',
      gravidade: 'alta',
      titulo: `${aprendizes.length} lançamento(s) com hora extra em aprendizes`,
      detalhe: 'A jornada de aprendiz não admite hora extra. Confira os apontamentos com a chefia imediata.',
      quantidade: aprendizes.length,
    });
  }

  const reincidentes = funcionariosReincidentes(lancs, limites);
  if (reincidentes.length) {
    alertas.push({
      tipo: 'reincidencia',
      gravidade: 'media',
      titulo: `${reincidentes.length} funcionário(s) com ocorrência em ${DIAS_PARA_REINCIDENCIA} dias ou mais`,
      detalhe: reincidentes.slice(0, 5).map((r) => `${r.nome} (${r.dias} dias)`).join(' · ')
        + (reincidentes.length > 5 ? ` · e mais ${reincidentes.length - 5}` : ''),
      quantidade: reincidentes.length,
    });
  }

  const divergentes = opcoes.importacoesComDivergencia ?? [];
  if (divergentes.length) {
    alertas.push({
      tipo: 'conciliacao',
      gravidade: 'alta',
      titulo: `${divergentes.length} importação(ões) gravada(s) com divergência de conciliação`,
      detalhe: divergentes.map((i) => (i.dataInicio === i.dataFim ? dataBR(i.dataInicio) : `${dataBR(i.dataInicio)} a ${dataBR(i.dataFim)}`)).join(' · '),
      quantidade: divergentes.length,
    });
  }

  return alertas;
}

export interface Reincidente {
  matricula: string;
  nome: string;
  departamentoNome: string;
  dias: number;
}

/** Funcionários com ocorrência acima do limite em vários dias do período. */
export function funcionariosReincidentes(
  lancs: Lancamento[],
  limites: LimitesFaixa = LIMITES_PADRAO,
): Reincidente[] {
  const porMatricula = new Map<string, { nome: string; departamentoNome: string; dias: Set<string> }>();
  for (const l of lancs) {
    if (l.extrasMin <= limites.verdeMaxMin) continue;
    const atual = porMatricula.get(l.matricula)
      ?? { nome: l.nome, departamentoNome: l.departamentoNome, dias: new Set<string>() };
    atual.nome = l.nome;
    atual.departamentoNome = l.departamentoNome;
    atual.dias.add(l.data);
    porMatricula.set(l.matricula, atual);
  }

  return [...porMatricula.entries()]
    .filter(([, v]) => v.dias.size >= DIAS_PARA_REINCIDENCIA)
    .map(([matricula, v]) => ({
      matricula,
      nome: v.nome,
      departamentoNome: v.departamentoNome,
      dias: v.dias.size,
    }))
    .sort((a, b) => b.dias - a.dias || a.nome.localeCompare(b.nome, 'pt-BR'));
}
