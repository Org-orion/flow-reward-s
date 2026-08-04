import { competenciaLabelLong } from '@/features/dashboard/utils/dates';
import type { BonusPercentualRow } from '../types/bonus-percentual.types';

/** Rótulo amigável do período efetivo (competências, sem timezone). */
export function periodLabel(row: BonusPercentualRow): string {
  const inicio = row.sentinela ? 'Regra inicial' : competenciaLabelLong(row.period.inicio);
  if (row.state.state === 'programada') return `${inicio} em diante`;
  if (row.period.emDiante) return `${inicio} até atual`;
  return `${inicio} até ${competenciaLabelLong(row.period.fim!)}`;
}

/** Rótulo curto de vigência (ou "Regra inicial" para sentinela). */
export function vigenciaLabel(row: BonusPercentualRow): string {
  return row.sentinela ? 'Regra inicial' : competenciaLabelLong(row.vigenciaInicio);
}
