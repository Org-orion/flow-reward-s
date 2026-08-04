import { AlertTriangle } from 'lucide-react';
import { competenciaLabelLong } from '@/features/dashboard/utils/dates';
import { vigenciaLabel } from './periodLabel';
import type { BonusPercentualRow } from '../types/bonus-percentual.types';

interface Props { rows: BonusPercentualRow[] }

/**
 * Escopo real da regra: a partir da PRIMEIRA vigência cadastrada, o processamento
 * de premiações remunera as bases de kits por este modelo percentual, e não mais
 * pelas faixas. Competências anteriores continuam no modelo de faixas.
 */
export function BonusPercentualNotice({ rows }: Props) {
  if (rows.length === 0) return null;

  // A linha do tempo vem em ordem decrescente; a mais antiga é o marco de virada.
  const primeira = rows[rows.length - 1];

  return (
    <div className="flex items-start gap-2 rounded-xl border border-status-warning/40 bg-status-warning/5 px-4 py-3 text-sm">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-status-warning" />
      <p className="text-foreground">
        Esta regra <strong>remunera de verdade</strong>: a partir de{' '}
        <strong>{primeira.sentinela ? vigenciaLabel(primeira) : competenciaLabelLong(primeira.vigenciaInicio)}</strong>, o
        processamento de premiações calcula as bases de kits por este modelo percentual, substituindo o modelo de faixas
        das Configurações Kits. Competências anteriores permanecem no modelo de faixas. Resultados já salvos não mudam
        sozinhos — só ao reprocessar a competência.
      </p>
    </div>
  );
}
