import { RotateCcw, PanelRightOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatNumberBR, formatPercentBR } from '@/lib/formatters';
import { ProductionNumberInput } from './ProductionNumberInput';
import { ProductionStatusBadge } from './ProductionStatusBadge';
import type { ProductionRow } from '../types/production-entry.types';
import type { ProductionFieldAccess } from '../domain/productionFieldAccess';

interface Props {
  row: ProductionRow;
  changed: boolean;
  onChangeField: (field: 'meta' | 'realizado', value: string) => void;
  onRestore: () => void;
  onOpenDrawer: () => void;
  /** Permissões de campo (ver src/config/permissions.ts). */
  campos: ProductionFieldAccess;
}

const fmtDesvio = (d: number | null) => {
  if (d == null) return '—';
  const s = formatNumberBR(Math.abs(d), Number.isInteger(d) ? 0 : 2);
  return d > 0 ? `+${s}` : d < 0 ? `−${s}` : s;
};

/** Card de setor para mobile — meta e realizado grandes, situação e desvio visíveis. */
export function ProductionEntryCard({ row, changed, onChangeField, onRestore, onOpenDrawer, campos }: Props) {
  return (
    <div className={cn('rounded-xl border border-border/70 bg-card p-4', changed && 'border-status-warning/40 bg-status-warning/[0.03]')}>
      <div className="flex items-start justify-between gap-2">
        <button type="button" onClick={onOpenDrawer} className="min-w-0 text-left">
          <p className="truncate text-sm font-semibold text-foreground">{row.setorNome}</p>
          <p className="truncate text-xs text-muted-foreground">{row.empresaNome || '—'} · {row.unidade}</p>
        </button>
        <ProductionStatusBadge situacao={row.situacao} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        {campos.verMeta && (
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">Meta</span>
            <ProductionNumberInput value={row.meta} changed={changed} ariaLabel={`Meta do setor ${row.setorNome}`} onCommit={(v) => onChangeField('meta', v)} readOnly={!campos.editarMeta} />
          </label>
        )}
        {campos.verRealizado && (
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">Realizado</span>
            <ProductionNumberInput value={row.realizado} changed={changed} ariaLabel={`Produção realizada do setor ${row.setorNome}`} onCommit={(v) => onChangeField('realizado', v)} readOnly={!campos.editarRealizado} />
          </label>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs">
        {campos.verDerivados && (
          <>
            <span className="text-muted-foreground">Percentual: <b className="text-foreground">{row.percentual != null ? formatPercentBR(row.percentual, 1) : '—'}</b></span>
            <span className={cn(row.desvio != null && row.desvio < 0 ? 'text-destructive' : 'text-muted-foreground')}>Desvio: {fmtDesvio(row.desvio)}</span>
          </>
        )}
        <div className="ml-auto flex items-center gap-1">
          {changed && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRestore} aria-label={`Restaurar ${row.setorNome}`}>
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onOpenDrawer} aria-label={`Ver detalhes do setor ${row.setorNome}`}>
            <PanelRightOpen className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
