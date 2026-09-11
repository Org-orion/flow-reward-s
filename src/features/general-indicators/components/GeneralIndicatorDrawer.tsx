import { useMemo } from 'react';
import { Pencil, GitCompareArrows, AlertTriangle } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatPercentBR, formatNumberBR } from '@/lib/formatters';
import { competenciaLabelLong } from '@/features/dashboard/utils/dates';
import { resolveIndicatorDefinition } from '../domain/indicatorDefinitions';
import { formatIndicatorValue, formatIndicatorDeviation } from '../domain/indicatorFormatting';
import { calcularVariacao, calcularVariacaoPP } from '../domain/indicatorCalculations';
import { GeneralIndicatorEvolutionChart } from './GeneralIndicatorEvolutionChart';
import { GeneralIndicatorStatusBadge } from './GeneralIndicatorStatusBadge';
import type { GeneralHistoryRow } from '../types/general-indicators.types';

interface Props {
  row: GeneralHistoryRow | null;
  serie: GeneralHistoryRow[];  // pontos do mesmo indicador (asc), para o mini-histórico
  onClose: () => void;
  onEdit: (row: GeneralHistoryRow) => void;
  /** Permissão de editar o registro (ver src/config/permissions.ts). */
  podeEditar?: boolean;
  onCompare: (row: GeneralHistoryRow) => void;
}

/** Drawer de detalhes de um registro — leitura, comparação e histórico recente. */
export function GeneralIndicatorDrawer({ row, serie, onClose, onEdit, onCompare, podeEditar = true }: Props) {
  const anterior = useMemo(() => {
    if (!row) return null;
    return serie.filter((p) => p.competencia < row.competencia).sort((a, b) => (a.competencia < b.competencia ? 1 : -1))[0] ?? null;
  }, [row, serie]);

  const serieAteAtual = useMemo(() => (row ? serie.filter((p) => p.competencia <= row.competencia).slice(-12) : []), [row, serie]);

  if (!row) return <Sheet open={false} onOpenChange={() => {}}><SheetContent /></Sheet>;

  const def = resolveIndicatorDefinition(row.codigo, row.nome);
  const variacaoReal = calcularVariacao(row.realizado, anterior?.realizado ?? null);
  const variacaoPP = calcularVariacaoPP(row.atingimento, anterior?.atingimento ?? null);
  const warnings = row.quality.filter((q) => q.severity === 'warning');

  return (
    <Sheet open={!!row} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-[600px]">
        <SheetHeader className="border-b border-border/60 px-5 py-4">
          <SheetTitle className="truncate">{row.nome}</SheetTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">{row.codigo} · {competenciaLabelLong(row.competencia)}</p>
          <div className="mt-1"><GeneralIndicatorStatusBadge situacao={row.situacao} /></div>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Realizado" value={formatIndicatorValue(row.realizado, def)} />
            <Field label="Meta" value={formatIndicatorValue(row.meta, def)} />
            <Field label="Atingimento" value={row.atingimento != null ? formatPercentBR(row.atingimento, 1) : '—'} />
            <Field label="Desvio" value={formatIndicatorDeviation(row.desvio, def)} />
          </div>

          {anterior && (
            <div className="rounded-xl border border-border/70 p-3 text-xs">
              <p className="mb-1 font-semibold uppercase tracking-wide text-muted-foreground">Comparação com competência anterior</p>
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                <span className="text-muted-foreground">Realizado: <b className="text-foreground">{formatIndicatorValue(anterior.realizado, def, { compact: true })}</b></span>
                <span className={cn(variacaoReal != null && (variacaoReal >= 0 ? 'text-success' : 'text-destructive'))}>
                  {variacaoReal != null ? `${variacaoReal >= 0 ? '+' : ''}${formatNumberBR(variacaoReal, 1)}% realizado` : '—'}
                </span>
                <span className={cn(variacaoPP != null && (variacaoPP >= 0 ? 'text-success' : 'text-destructive'))}>
                  {variacaoPP != null ? `${variacaoPP >= 0 ? '+' : ''}${formatNumberBR(variacaoPP, 1)} p.p. atingimento` : '—'}
                </span>
              </div>
            </div>
          )}

          {warnings.length > 0 && (
            <div className="rounded-xl border border-status-warning/40 bg-status-warning/5 p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-status-warning"><AlertTriangle className="h-4 w-4" /> Possível inconsistência</p>
              <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                {warnings.map((w, i) => <li key={i}><b className="text-foreground">{w.title}.</b> {w.message}</li>)}
              </ul>
            </div>
          )}

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Histórico recente</p>
            <GeneralIndicatorEvolutionChart points={serieAteAtual} def={def} />
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-border/60 px-5 py-3">
          {podeEditar && <Button variant="outline" className="flex-1 gap-1.5" onClick={() => onEdit(row)}><Pencil className="h-4 w-4" /> Editar registro</Button>}
          <Button variant="ghost" className="flex-1 gap-1.5" onClick={() => onCompare(row)}><GitCompareArrows className="h-4 w-4" /> Comparar período</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/70 p-2.5">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
