import { RotateCcw, PanelRightOpen } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';
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
  comparing: boolean;
  onChangeField: (field: 'meta' | 'realizado', value: string) => void;
  onRestore: () => void;
  onOpenDrawer: () => void;
  onEnterNext?: () => void;
  /** Permissões de campo (ver src/config/permissions.ts). */
  campos: ProductionFieldAccess;
}

const fmtDesvio = (d: number | null) => {
  if (d == null) return '—';
  const s = formatNumberBR(Math.abs(d), Number.isInteger(d) ? 0 : 2);
  return d > 0 ? `+${s}` : d < 0 ? `−${s}` : s;
};

export function ProductionEntryRow({ row, changed, comparing, onChangeField, onRestore, onOpenDrawer, onEnterNext, campos }: Props) {
  return (
    <TableRow className={cn(changed && 'bg-status-warning/[0.04]', row.situacao === 'pendente' && !changed && 'bg-muted/20')}>
      <TableCell>
        <button type="button" onClick={onOpenDrawer} className="text-left">
          <p className="text-sm font-medium text-foreground hover:underline">{row.setorNome}</p>
          <p className="text-xs text-muted-foreground">{row.empresaNome || '—'} · {row.unidade}</p>
        </button>
      </TableCell>

      {campos.verMeta && (
        <TableCell className="text-right">
          <ProductionNumberInput value={row.meta} changed={changed} ariaLabel={`Meta do setor ${row.setorNome}`} onCommit={(v) => onChangeField('meta', v)} onEnterNext={onEnterNext} readOnly={!campos.editarMeta} />
          {comparing && <p className="mt-0.5 text-[11px] text-muted-foreground">ant.: {row.metaAnterior != null ? formatNumberBR(row.metaAnterior) : '—'}</p>}
        </TableCell>
      )}

      {campos.verRealizado && (
        <TableCell className="text-right">
          <ProductionNumberInput value={row.realizado} changed={changed} ariaLabel={`Produção realizada do setor ${row.setorNome}`} onCommit={(v) => onChangeField('realizado', v)} onEnterNext={onEnterNext} readOnly={!campos.editarRealizado} />
          {comparing && <p className="mt-0.5 text-[11px] text-muted-foreground">ant.: {row.realizadoAnterior != null ? formatNumberBR(row.realizadoAnterior) : '—'}</p>}
        </TableCell>
      )}

      {campos.verDerivados && (
        <TableCell className="text-right text-sm font-semibold tabular-nums">
          {row.percentual != null ? formatPercentBR(row.percentual, 1) : '—'}
          {comparing && row.variacaoRealizado != null && (
            <p className={cn('mt-0.5 text-[11px]', row.variacaoRealizado >= 0 ? 'text-success' : 'text-destructive')}>
              {row.variacaoRealizado >= 0 ? '+' : ''}{formatNumberBR(row.variacaoRealizado, 1)}% vs. ant.
            </p>
          )}
        </TableCell>
      )}

      {campos.verDerivados && (
        <TableCell className={cn('text-right text-sm tabular-nums', row.desvio != null && row.desvio < 0 ? 'text-destructive' : 'text-foreground')}>
          {fmtDesvio(row.desvio)}
        </TableCell>
      )}

      <TableCell><ProductionStatusBadge situacao={row.situacao} /></TableCell>

      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          {changed && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRestore} aria-label={`Restaurar ${row.setorNome}`}>
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onOpenDrawer} aria-label={`Ver detalhes do setor ${row.setorNome}`}>
            <PanelRightOpen className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
