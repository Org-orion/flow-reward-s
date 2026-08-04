// Permissões derivadas por estado + utilização — PURO.
//
// Regra: apenas configurações PROGRAMADAS e NÃO UTILIZADAS podem ser editadas ou
// excluídas. Atual/histórica ou utilizada → protegida (criar nova vigência).
//
// A lógica é genérica a qualquer regra com vigência mensal e vive em
// `@/domain/vigencias`. Este módulo mantém os nomes usados pela feature.
import {
  canDeleteVigencia,
  canEditVigencia,
  vigenciaProtectionReason,
} from '@/domain/vigencias/vigenciaProtecao';

export const canEditConfig = canEditVigencia;
export const canDeleteConfig = canDeleteVigencia;
export const protectionReason = vigenciaProtectionReason;
