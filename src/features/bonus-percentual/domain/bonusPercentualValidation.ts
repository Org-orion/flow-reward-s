// Validação de parâmetros do bônus percentual — PURA e testável.
// Não inventa limites além do domínio: meta/bloco > 0; valores ≥ 0;
// percentual máximo: null (sem teto) ou > 0.
import { isValidVigencia } from '@/domain/vigencias/vigenciaSelecao';

export interface BonusPercentualInputForm {
  vigenciaInicio: string;              // 'YYYY-MM'
  metaKits: number | null;
  bonusMeta: number | null;
  blocoKits: number | null;
  valorBloco: number | null;
  percentualMaximo: number | null;
}

export interface BonusPercentualValidation { valid: boolean; errors: string[]; warnings: string[] }

const positivo = (v: number | null): boolean => v != null && Number.isFinite(v) && v > 0;
const naoNegativo = (v: number | null): boolean => v != null && Number.isFinite(v) && v >= 0;

export function validateBonusPercentual(input: BonusPercentualInputForm): BonusPercentualValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isValidVigencia(input.vigenciaInicio)) errors.push('Informe a vigência (mês/ano).');
  if (!positivo(input.metaKits)) errors.push('A meta de kits deve ser maior que zero.');
  if (!positivo(input.blocoKits)) errors.push('O bloco de kits deve ser maior que zero.');
  if (!naoNegativo(input.valorBloco)) errors.push('O valor por bloco não pode ser negativo.');
  if (!naoNegativo(input.bonusMeta)) errors.push('O bônus ao bater a meta não pode ser negativo.');
  if (input.percentualMaximo != null && !positivo(input.percentualMaximo)) {
    errors.push('O percentual máximo deve ser maior que zero, ou "sem teto".');
  }

  if (input.metaKits != null && input.blocoKits != null && positivo(input.blocoKits) && input.blocoKits > input.metaKits) {
    warnings.push('O bloco é maior que a própria meta — o primeiro bloco completo (100%) só será alcançado com o dobro da meta.');
  }
  if (input.percentualMaximo != null && positivo(input.percentualMaximo)) {
    warnings.push(`O percentual é limitado a ${input.percentualMaximo}% — produção acima desse ponto não aumenta o bônus.`);
  }
  if (input.valorBloco === 0) {
    warnings.push('O valor por bloco é zero: o percentual será calculado, mas o adicional em reais ficará em R$ 0,00.');
  }

  return { valid: errors.length === 0, errors, warnings };
}
