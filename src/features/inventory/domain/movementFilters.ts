// Descrição legível dos filtros de movimentação — PURA.
//
// Fonte ÚNICA para as etiquetas da tela e para a linha "Filtros aplicados" do
// PDF. Se cada lado montasse seu próprio texto, um filtro novo apareceria na
// tela e sumiria do relatório — num documento de auditoria, dizer errado o que
// foi filtrado é pior do que não dizer nada.

import { MOVEMENT_TYPE_LABEL } from './domainConstants';
import { ORIGEM_LABEL, DIRECAO_LABEL } from '../components/movements/movementMeta';
import { PERIODO_LABEL } from '../components/dashboard/derive';
import { competenciaLabelLong } from '@/features/dashboard/utils/dates';
import type { MovFiltros } from '../hooks/useInventoryMovements';

export interface MovFiltroOpcoes {
  unidades: { id: string; nome: string }[];
  variantes: { id: string; nome: string }[];
}

/** Um filtro ativo: `chave` identifica qual limpar; `rotulo` é o texto. */
export interface MovFiltroAtivo {
  chave: keyof MovFiltros;
  rotulo: string;
}

/** Rótulo do período selecionado (inclui o mês fechado). */
export function periodoRotuloMov(filtros: MovFiltros): string {
  if (filtros.periodo === 'todos') return 'Todo o histórico';
  if (filtros.periodo === 'mes_ref') {
    return filtros.mesRef ? competenciaLabelLong(filtros.mesRef) : 'Mês não selecionado';
  }
  return PERIODO_LABEL[filtros.periodo];
}

/**
 * Filtros ativos, na ordem em que fazem sentido ler. NÃO inclui o período —
 * ele é sempre exibido à parte, porque nunca está "inativo".
 */
export function descreverFiltrosMov(filtros: MovFiltros, opcoes: MovFiltroOpcoes): MovFiltroAtivo[] {
  const out: MovFiltroAtivo[] = [];
  const nomeUnidade = opcoes.unidades.find(u => u.id === filtros.unidadeId)?.nome ?? filtros.unidadeId;
  const nomeVariante = opcoes.variantes.find(v => v.id === filtros.varianteId)?.nome ?? filtros.varianteId;

  if (filtros.tipo) {
    const rot = MOVEMENT_TYPE_LABEL[filtros.tipo as keyof typeof MOVEMENT_TYPE_LABEL] ?? filtros.tipo;
    out.push({ chave: 'tipo', rotulo: `Tipo: ${rot}` });
  }
  if (filtros.direcao) out.push({ chave: 'direcao', rotulo: `Direção: ${DIRECAO_LABEL[filtros.direcao]}` });
  if (filtros.unidadeId) out.push({ chave: 'unidadeId', rotulo: `Local: ${nomeUnidade}` });
  if (filtros.origem) out.push({ chave: 'origem', rotulo: `Origem: ${ORIGEM_LABEL[filtros.origem] ?? filtros.origem}` });
  if (filtros.categoria) out.push({ chave: 'categoria', rotulo: `Categoria: ${filtros.categoria}` });
  if (filtros.varianteId) out.push({ chave: 'varianteId', rotulo: `Item: ${nomeVariante}` });
  if (filtros.responsavel) out.push({ chave: 'responsavel', rotulo: `Responsável: ${filtros.responsavel}` });
  if (filtros.comNf) out.push({ chave: 'comNf', rotulo: 'Com NF' });
  if (filtros.comObs) out.push({ chave: 'comObs', rotulo: 'Com observação' });
  return out;
}

/** Linha única para o cabeçalho do relatório. */
export function resumoFiltrosMov(filtros: MovFiltros, opcoes: MovFiltroOpcoes, busca: string): string {
  const partes = descreverFiltrosMov(filtros, opcoes).map(f => f.rotulo);
  if (busca.trim()) partes.push(`Busca: "${busca.trim()}"`);
  return partes.length ? partes.join(' · ') : 'Nenhum filtro aplicado';
}
