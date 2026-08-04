import { useMemo } from 'react';
import { currentCompetencia } from '@/features/dashboard/utils/dates';
import { computeVigenciaPeriodsAndStates } from '@/domain/vigencias/vigenciaPeriodos';
import { isSentinelaVigencia, selectVigenciaForCompetencia } from '@/domain/vigencias/vigenciaSelecao';
import { buildConfigUsage, competenciasAfetadasPorRetroatividade } from '@/domain/premiacao/usoConfigPorCompetencia';
import { useResultadosPremiacao } from '@/hooks/useResultadosPremiacao';
import { useConfiguracoesBonusPercentual } from './useConfiguracoesBonusPercentual';
import type { BonusPercentualRow } from '../types/bonus-percentual.types';

/**
 * Composição da Central de Bônus Percentual. Constrói as linhas enriquecidas
 * (período efetivo + estado + utilização derivada) uma vez, em lote, reusando o
 * domínio genérico de vigências. Reexpõe create/update/delete (delete é soft).
 *
 * A utilização importa porque esta regra remunera: uma vigência que já governou
 * competências processadas fica protegida contra edição.
 */
export function useBonusPercentualConfigs() {
  const { configuracoes, loading, createConfiguracao, updateConfiguracao, deleteConfiguracao, refetch } =
    useConfiguracoesBonusPercentual();
  const { resultados } = useResultadosPremiacao();

  const competenciaAtual = useMemo(() => currentCompetencia(), []);

  const bases = useMemo(
    () => configuracoes.map(c => ({ id: c.id, vigenciaInicio: (c.vigencia_inicio ?? '').slice(0, 7) })),
    [configuracoes],
  );

  const periods = useMemo(() => computeVigenciaPeriodsAndStates(bases, competenciaAtual), [bases, competenciaAtual]);
  const usageMap = useMemo(() => buildConfigUsage(bases, resultados), [bases, resultados]);

  const vigCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of bases) m.set(b.vigenciaInicio, (m.get(b.vigenciaInicio) ?? 0) + 1);
    return m;
  }, [bases]);

  const rows = useMemo<BonusPercentualRow[]>(() => configuracoes.map((c) => {
    const vig = (c.vigencia_inicio ?? '').slice(0, 7);
    const ps = periods.get(c.id)!;
    return {
      id: c.id,
      vigenciaInicio: vig,
      metaKits: Number(c.meta_kits),
      bonusMeta: Number(c.bonus_meta),
      blocoKits: Number(c.bloco_kits),
      valorBloco: Number(c.valor_bloco),
      percentualMaximo: c.percentual_maximo == null ? null : Number(c.percentual_maximo),
      createdAt: c.created_at ?? null,
      updatedAt: c.updated_at ?? null,
      sentinela: isSentinelaVigencia(vig),
      period: ps.period,
      state: ps.state,
      usage: usageMap.get(c.id)!,
      duplicado: (vigCount.get(vig) ?? 0) > 1,
    } satisfies BonusPercentualRow;
  }), [configuracoes, periods, usageMap, vigCount]);

  // Ordem decrescente por vigência (linha do tempo).
  const rowsDesc = useMemo(() => [...rows].sort((a, b) => b.vigenciaInicio.localeCompare(a.vigenciaInicio)), [rows]);
  const rowById = useMemo(() => new Map(rows.map(r => [r.id, r])), [rows]);

  const atual = useMemo(() => {
    const sel = selectVigenciaForCompetencia(bases, competenciaAtual);
    return sel ? rowById.get(sel.id) ?? null : null;
  }, [bases, competenciaAtual, rowById]);

  const proxima = useMemo(() => {
    const futuras = rowsDesc.filter(r => r.state.state === 'programada');
    return futuras.length ? futuras[futuras.length - 1] : null; // programada mais próxima
  }, [rowsDesc]);

  const findByVigencia = (vigencia: string, exceptId?: string): BonusPercentualRow | undefined =>
    rows.find(r => r.id !== exceptId && r.vigenciaInicio === vigencia.slice(0, 7));

  /** Competências já processadas afetadas se a vigência for retroativa. */
  const retroFor = (vigencia: string) => competenciasAfetadasPorRetroatividade(resultados, vigencia);

  return {
    rows: rowsDesc, rowById, atual, proxima, competenciaAtual, loading,
    createConfiguracao, updateConfiguracao, deleteConfiguracao, refetch, findByVigencia, retroFor,
  };
}

export type UseBonusPercentualConfigsReturn = ReturnType<typeof useBonusPercentualConfigs>;
