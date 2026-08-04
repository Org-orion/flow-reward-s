// Períodos efetivos e estado (Programada/Atual/Histórica) — PURO.
//
// Período efetivo de cada regra: [vigência, mês anterior à próxima vigência).
// Sem próxima → "em diante". NÃO persiste data final artificial.
import { shiftCompetencia } from '@/features/dashboard/utils/dates';
import { selectVigenciaForCompetencia, type HasVigencia } from './vigenciaSelecao';
import type { VigenciaEstado, VigenciaPeriodo } from './vigenciaTypes';

export interface VigenciaPeriodoEstado { period: VigenciaPeriodo; state: VigenciaEstado }

const STATE_META: Record<VigenciaEstado['state'], Omit<VigenciaEstado, 'state'>> = {
  programada: { label: 'Programada', variant: 'warning' },
  atual: { label: 'Atual', variant: 'success' },
  historica: { label: 'Histórica', variant: 'neutral' },
};

/**
 * Calcula período efetivo + estado para cada regra com vigência.
 * @param configs itens com `id` e `vigenciaInicio` ('YYYY-MM').
 * @param competenciaAtual competência corrente ('YYYY-MM').
 */
export function computeVigenciaPeriodsAndStates<T extends HasVigencia & { id: string }>(
  configs: T[],
  competenciaAtual: string,
): Map<string, VigenciaPeriodoEstado> {
  const asc = [...configs].sort((a, b) => a.vigenciaInicio.localeCompare(b.vigenciaInicio));
  const atual = selectVigenciaForCompetencia(configs, competenciaAtual);
  const result = new Map<string, VigenciaPeriodoEstado>();

  asc.forEach((c, i) => {
    const next = asc[i + 1];
    const period: VigenciaPeriodo = next
      ? { inicio: c.vigenciaInicio, fim: shiftCompetencia(next.vigenciaInicio, -1), emDiante: false }
      : { inicio: c.vigenciaInicio, fim: null, emDiante: true };

    let stateKind: VigenciaEstado['state'];
    if (c.vigenciaInicio > competenciaAtual) stateKind = 'programada';
    else if (atual && c.id === atual.id) stateKind = 'atual';
    else stateKind = 'historica';

    result.set(c.id, { period, state: { state: stateKind, ...STATE_META[stateKind] } });
  });

  return result;
}
