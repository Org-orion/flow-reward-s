// Adaptadores entre a linha da UI e as entradas dos cálculos puros. Evita repetir
// o mapeamento de campos em cada componente.
import type { BonusPercentualInput } from './bonusPercentualCalculo';
import type { BonusPercentualCompareInput } from './bonusPercentualComparacao';
import type { BonusPercentualRow } from '../types/bonus-percentual.types';

export function toCalculoInput(row: BonusPercentualRow): BonusPercentualInput {
  return {
    metaKits: row.metaKits,
    bonusMeta: row.bonusMeta,
    blocoKits: row.blocoKits,
    valorBloco: row.valorBloco,
    percentualMaximo: row.percentualMaximo,
  };
}

export function toCompareInput(row: BonusPercentualRow): BonusPercentualCompareInput {
  return {
    metaKits: row.metaKits,
    bonusMeta: row.bonusMeta,
    blocoKits: row.blocoKits,
    valorBloco: row.valorBloco,
    percentualMaximo: row.percentualMaximo,
  };
}
