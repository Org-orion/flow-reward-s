/**
 * Motor de cálculo do BÔNUS PERCENTUAL por kits — modelo PROPORCIONAL.
 *
 * Vive no motor (e não numa feature) porque, a partir da vigência cadastrada na
 * tela "Bônus Percentual por Kits", ESTE cálculo é o que remunera as bases de
 * kits — substituindo `calcularComissao` (modelo de faixas) para as competências
 * cobertas por uma configuração percentual.
 *
 * A regra age DEPOIS de a meta ser batida. O percentual é a grandeza primária e o
 * valor em reais é derivado dele:
 *
 *   excedente  = max(0, kits − metaKits)
 *   percentual = (excedente / blocoKits) × 100      → PROPORCIONAL (frações contam)
 *   percentualAplicado = min(percentual, percentualMaximo ?? ∞)
 *   adicional  = (percentualAplicado / 100) × valorBloco
 *   total      = bonusMeta + adicional              (bonusMeta só se a meta foi batida)
 *
 * Diferença deliberada em relação a `calcularComissao`, que usa Math.floor: aqui
 * NÃO há degrau — 500 kits acima da meta com bloco de 1.000 valem 50%, não 0%.
 *
 * SELEÇÃO DO MODELO (ver `features/rewards-processing/domain/rewardsPreview.ts`):
 * havendo configuração percentual vigente para a competência, ela vence; sem
 * configuração, o cálculo permanece no modelo de faixas. A vigência cadastrada é,
 * portanto, o marco de virada — não existe data fixa no código.
 */

export interface BonusPercentualKitsInput {
  metaKits: number;
  bonusMeta: number;
  blocoKits: number;
  valorBloco: number;
  percentualMaximo: number | null; // escala percentual (250 = 250%); null = sem teto
}

export interface BonusPercentualKitsBreakdown {
  kits: number;
  meta: number;
  atingiuMeta: boolean;
  excedente: number;             // kits acima da meta (0 se abaixo)
  blocoKits: number;
  blocosCompletos: number;       // apenas informativo — NÃO usado no valor
  percentual: number;            // percentual bruto (250 = 250%)
  percentualAplicado: number;    // após o teto
  tetoAplicado: boolean;         // o teto cortou o percentual?
  percentualMaximo: number | null;
  bonusMetaAplicado: number;     // bonusMeta se atingiu a meta; senão 0
  adicional: number;             // derivado do percentual aplicado
  bonusTotal: number;            // bonusMetaAplicado + adicional
}

export function calcularBonusPercentualKits(
  kits: number,
  cfg: BonusPercentualKitsInput,
): BonusPercentualKitsBreakdown {
  const kitsSeguro = Number.isFinite(kits) && kits > 0 ? kits : 0;
  const atingiuMeta = kitsSeguro >= cfg.metaKits;
  const excedente = atingiuMeta ? kitsSeguro - cfg.metaKits : 0;

  const percentual = cfg.blocoKits > 0 ? (excedente / cfg.blocoKits) * 100 : 0;
  const teto = cfg.percentualMaximo;
  const percentualAplicado = teto != null && percentual > teto ? teto : percentual;

  const bonusMetaAplicado = atingiuMeta ? cfg.bonusMeta : 0;
  const adicional = (percentualAplicado / 100) * cfg.valorBloco;

  return {
    kits: kitsSeguro,
    meta: cfg.metaKits,
    atingiuMeta,
    excedente,
    blocoKits: cfg.blocoKits,
    blocosCompletos: cfg.blocoKits > 0 ? Math.floor(excedente / cfg.blocoKits) : 0,
    percentual,
    percentualAplicado,
    tetoAplicado: teto != null && percentual > teto,
    percentualMaximo: teto,
    bonusMetaAplicado,
    adicional,
    bonusTotal: bonusMetaAplicado + adicional,
  };
}
