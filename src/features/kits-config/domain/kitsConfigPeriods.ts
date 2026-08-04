// Períodos efetivos e estado (Programada/Atual/Histórica) — PURO.
//
// Período efetivo de cada config: [vigência, mês anterior à próxima vigência).
// Sem próxima → "em diante". NÃO persiste data final artificial.
//
// A lógica é genérica a qualquer regra com vigência mensal e vive em
// `@/domain/vigencias`. Este módulo mantém os nomes usados pela feature.
import {
  computeVigenciaPeriodsAndStates,
  type VigenciaPeriodoEstado,
} from '@/domain/vigencias/vigenciaPeriodos';

export type PeriodState = VigenciaPeriodoEstado;

/**
 * Calcula período efetivo + estado para cada configuração.
 * @param configs itens com `id` e `vigenciaInicio` ('YYYY-MM').
 * @param competenciaAtual competência corrente ('YYYY-MM').
 */
export const computePeriodsAndStates = computeVigenciaPeriodsAndStates;
