// Seleção da configuração vigente por competência — PURA. Espelha
// `useConfiguracoesKits.getConfigParaCompetencia` (maior vigência ≤ competência).
// Não recalcula bônus (isso é do motor).
//
// A lógica é genérica a qualquer regra com vigência mensal e vive em
// `@/domain/vigencias`. Este módulo mantém os nomes usados pela feature.
import {
  isSentinelaVigencia,
  selectVigenciaForCompetencia,
  type HasVigencia,
} from '@/domain/vigencias/vigenciaSelecao';

export type { HasVigencia };

/** Config vigente para a competência ('YYYY-MM'): maior vigência ≤ competência. */
export const selectConfigForCompetencia = selectVigenciaForCompetencia;

/** Sentinela: vigência muito antiga que funciona como "regra inicial" (desde sempre). */
export const isSentinela = isSentinelaVigencia;
