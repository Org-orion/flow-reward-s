// Escala de referência da regra — PURA. Mostra como o percentual (e o valor
// derivado) evolui em múltiplos do bloco, incluindo frações, para tornar visível
// que o cálculo é proporcional.
import { computeBonusPercentual, type BonusPercentualBreakdown, type BonusPercentualInput } from './bonusPercentualCalculo';

/** Múltiplos de bloco usados na escala (0,5 e 2,5 evidenciam a proporcionalidade). */
export const ESCALA_MULTIPLOS = [0, 0.5, 1, 2.5, 5, 10] as const;

export interface EscalaPonto {
  multiplo: number;    // blocos acima da meta (pode ser fracionário)
  kits: number;
  breakdown: BonusPercentualBreakdown;
}

export function buildEscalaPercentual(cfg: BonusPercentualInput, multiplos: readonly number[] = ESCALA_MULTIPLOS): EscalaPonto[] {
  return multiplos.map((multiplo) => {
    const kits = cfg.metaKits + cfg.blocoKits * multiplo;
    return { multiplo, kits, breakdown: computeBonusPercentual(kits, cfg) };
  });
}
