// Permissões derivadas por estado + utilização — PURO.
//
// Regra: apenas regras PROGRAMADAS e NÃO UTILIZADAS podem ser editadas ou
// excluídas. Atual/histórica ou utilizada → protegida (criar nova vigência).
import type { VigenciaEstadoKind, VigenciaUso } from './vigenciaTypes';

export function canEditVigencia(state: VigenciaEstadoKind, usage: VigenciaUso): boolean {
  return state === 'programada' && !usage.utilizada;
}

export function canDeleteVigencia(state: VigenciaEstadoKind, usage: VigenciaUso): boolean {
  return state === 'programada' && !usage.utilizada;
}

export function vigenciaProtectionReason(state: VigenciaEstadoKind, usage: VigenciaUso): string | null {
  if (canEditVigencia(state, usage)) return null;
  if (usage.utilizada) return 'Esta configuração já foi utilizada em processamentos. Para alterar a regra, crie uma nova vigência.';
  if (state === 'atual') return 'Esta é a configuração vigente. Para alterar a regra, crie uma nova vigência.';
  return 'Configuração histórica protegida. Para alterar a regra, crie uma nova vigência.';
}
