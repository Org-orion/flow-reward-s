// Cálculo do bônus percentual por kits — PURO e testável.
//
// A regra vive no MOTOR (`@/domain/premiacao/bonusPercentualKits`) porque é ela que
// remunera as bases de kits a partir da vigência cadastrada nesta tela. Este módulo
// mantém os nomes usados pela feature e acrescenta apenas apoio de apresentação.
import {
  calcularBonusPercentualKits,
  type BonusPercentualKitsBreakdown,
  type BonusPercentualKitsInput,
} from '@/domain/premiacao/bonusPercentualKits';

export type BonusPercentualInput = BonusPercentualKitsInput;
export type BonusPercentualBreakdown = BonusPercentualKitsBreakdown;

export const computeBonusPercentual = calcularBonusPercentualKits;

/**
 * Quantidade de kits do exemplo padrão da regra: meta + 2,5 blocos → 250%.
 * O bloco fracionado é intencional: evidencia que o cálculo é proporcional.
 */
export function kitsExemplo(cfg: Pick<BonusPercentualInput, 'metaKits' | 'blocoKits'>): number {
  return cfg.metaKits + cfg.blocoKits * 2.5;
}
