import { OvertimeShell } from '@/features/overtime/components/OvertimeShell';

/**
 * Rota /horas-extras — módulo de Horas Extras (ponto diário do Secullum).
 * A orquestração vive na feature `overtime`; esta página apenas monta o shell.
 * Acesso pela seção `horas_extras` (admin passa por cima), com permissão
 * granular por tela — ver src/config/permissions.ts.
 */
export default function HorasExtras() {
  return <OvertimeShell />;
}
