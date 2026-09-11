import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatNumberBR, formatPercentBR } from '@/lib/formatters';
import { SectorIndicatorNumberInput } from './SectorIndicatorNumberInput';
import { SectorIndicatorStatus } from './SectorIndicatorStatus';
import { CELL_STATE_META } from '../domain/indicatorStatus';
import type { IndicatorDefinition } from '../domain/indicatorDefinitions';
import type { IndicatorCell } from '../types/sector-indicators.types';

interface Props {
  def: IndicatorDefinition;
  cell: IndicatorCell;
  changed: boolean;
  disabled?: boolean;
  /** Sem permissão no campo `meta` (ver src/config/permissions.ts). */
  metaBloqueada?: boolean;
  /** Sem permissão no campo `realizado`. */
  realizadoBloqueado?: boolean;
  onCommit: (field: 'meta' | 'realizado', value: string) => void;
  onRestore: () => void;
  onCtrlEnter?: () => void;
}

const fmtDesvio = (d: number | null) => {
  if (d == null) return '—';
  const s = formatNumberBR(Math.abs(d), Number.isInteger(d) ? 0 : 2);
  return d > 0 ? `+${s}` : d < 0 ? `−${s}` : s;
};

/** Editor de um indicador — meta/realizado + atingimento/diferença/situação/comparação. */
export function SectorIndicatorEditor({ def, cell, changed, disabled, metaBloqueada, realizadoBloqueado, onCommit, onRestore, onCtrlEnter }: Props) {
  const stateMeta = CELL_STATE_META[cell.state];
  return (
    <div className={cn('rounded-xl border border-border/70 p-3.5', changed && 'border-status-warning/50 bg-status-warning/[0.04]')}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={cn('h-2 w-2 rounded-full', stateMeta.dot)} />
          <p className="text-sm font-semibold text-foreground">{def.label}</p>
        </div>
        {changed && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRestore} aria-label={`Restaurar ${def.label}`}>
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Meta{metaBloqueada && <span className="ml-1 normal-case text-muted-foreground/70">(somente leitura)</span>}
          </span>
          <SectorIndicatorNumberInput value={cell.meta} changed={changed} disabled={disabled || metaBloqueada} ariaLabel={`Meta de ${def.label}`} onCommit={(v) => onCommit('meta', v)} onCtrlEnter={onCtrlEnter} />
        </label>
        <label className="space-y-1">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Realizado{realizadoBloqueado && <span className="ml-1 normal-case text-muted-foreground/70">(somente leitura)</span>}
          </span>
          <SectorIndicatorNumberInput value={cell.realizado} changed={changed} disabled={disabled || realizadoBloqueado} ariaLabel={`Realizado de ${def.label}`} onCommit={(v) => onCommit('realizado', v)} onCtrlEnter={onCtrlEnter} />
        </label>
      </div>

      <div className="mt-3 grid grid-cols-3 items-end gap-2 text-sm">
        <div>
          <p className="text-[11px] text-muted-foreground">Atingimento</p>
          <p className="font-semibold tabular-nums">{cell.percentual != null ? formatPercentBR(cell.percentual, def.precision) : '—'}</p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">Diferença</p>
          <p className={cn('font-medium tabular-nums', cell.desvio != null && cell.desvio < 0 ? 'text-destructive' : 'text-foreground')}>{fmtDesvio(cell.desvio)}</p>
        </div>
        <div className="text-right"><SectorIndicatorStatus situacao={
          cell.state === 'atingido' ? 'superada' : cell.state === 'atencao' ? 'proxima' : cell.state === 'abaixo' ? 'abaixo' : cell.state === 'sem_medicao' ? 'sem_medicao' : 'pendente'
        } /></div>
      </div>

      {cell.percentualAnterior != null && (
        <div className="mt-2 flex items-center gap-3 border-t border-border/50 pt-2 text-xs text-muted-foreground">
          <span>Competência anterior: <b className="text-foreground">{formatPercentBR(cell.percentualAnterior, def.precision)}</b></span>
          {cell.variacaoPP != null && (
            <span className={cn(cell.variacaoPP >= 0 ? 'text-success' : 'text-destructive')}>
              {cell.variacaoPP >= 0 ? '+' : ''}{formatNumberBR(cell.variacaoPP, 1)} p.p.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
