import { useState } from 'react';
import { ArrowUpDown } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatPercentBR } from '@/lib/formatters';
import { competenciaShortLabelBR } from '../domain/indicatorCalculations';
import { resolveIndicatorDefinition } from '../domain/indicatorDefinitions';
import { formatIndicatorValue, formatIndicatorDeviation } from '../domain/indicatorFormatting';
import { GeneralIndicatorStatusBadge } from './GeneralIndicatorStatusBadge';
import { GeneralIndicatorQualityBadge } from './GeneralIndicatorQualityBadge';
import { GeneralIndicatorsActionsMenu } from './GeneralIndicatorsActionsMenu';
import type { GeneralHistoryRow } from '../types/general-indicators.types';

interface Props {
  rows: GeneralHistoryRow[];
  onOpenDrawer: (row: GeneralHistoryRow) => void;
  onEdit: (row: GeneralHistoryRow) => void;
  /** Permissões (ver src/config/permissions.ts). */
  podeEditar?: boolean;
  podeExcluir?: boolean;
  onCompare: (row: GeneralHistoryRow) => void;
  onDelete: (row: GeneralHistoryRow) => Promise<void> | void;
}

export function GeneralIndicatorsHistoryTable({ rows, onOpenDrawer, onEdit, onCompare, onDelete, podeEditar = true, podeExcluir = true }: Props) {
  const [asc, setAsc] = useState(false);
  const sorted = [...rows].sort((a, b) => (a.competencia === b.competencia ? a.nome.localeCompare(b.nome) : a.competencia < b.competencia ? 1 : -1) * (asc ? -1 : 1));

  const actions = (r: GeneralHistoryRow) => (
    <GeneralIndicatorsActionsMenu
      indicadorLabel={r.nome}
      competenciaLabel={competenciaShortLabelBR(r.competencia)}
      onView={() => onOpenDrawer(r)}
      onEdit={() => onEdit(r)}
      podeEditar={podeEditar}
      podeExcluir={podeExcluir}
      onCompare={() => onCompare(r)}
      onDelete={() => onDelete(r)}
    />
  );

  return (
    <>
      <div className="hidden max-h-[600px] overflow-auto rounded-xl border border-border/70 md:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50 [&>th]:sticky [&>th]:top-0 [&>th]:z-10 [&>th]:bg-muted/95">
              <TableHead>Indicador</TableHead>
              <TableHead>
                <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => setAsc((v) => !v)}>
                  Competência <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead className="text-right">Meta</TableHead>
              <TableHead className="text-right">Realizado</TableHead>
              <TableHead className="text-right">Desvio</TableHead>
              <TableHead className="text-right">Atingimento</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead className="w-10 text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">Nenhum registro encontrado.</TableCell></TableRow>
            ) : sorted.map((r) => {
              const def = resolveIndicatorDefinition(r.codigo, r.nome);
              return (
                <TableRow key={r.registroId} className="cursor-pointer hover:bg-muted/40" onClick={() => onOpenDrawer(r)}>
                  <TableCell className="text-sm">
                    <span className="font-medium text-foreground">{r.nome}</span>
                    <span className="block text-xs text-muted-foreground">{r.codigo}</span>
                  </TableCell>
                  <TableCell className="text-sm font-medium">{competenciaShortLabelBR(r.competencia)}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{formatIndicatorValue(r.meta, def)}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{formatIndicatorValue(r.realizado, def)}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{formatIndicatorDeviation(r.desvio, def, { compact: true })}</TableCell>
                  <TableCell className="text-right text-sm font-semibold tabular-nums">{r.atingimento != null ? formatPercentBR(r.atingimento, 1) : '—'}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <GeneralIndicatorStatusBadge situacao={r.situacao} />
                      <GeneralIndicatorQualityBadge signals={r.quality} />
                    </div>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>{actions(r)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile — cards */}
      <div className="space-y-2.5 md:hidden">
        {sorted.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Nenhum registro encontrado.</p>
        ) : sorted.map((r) => {
          const def = resolveIndicatorDefinition(r.codigo, r.nome);
          return (
            <div key={r.registroId} className="rounded-xl border border-border/70 bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <button type="button" onClick={() => onOpenDrawer(r)} className="min-w-0 text-left">
                  <p className="truncate text-sm font-semibold text-foreground">{r.nome}</p>
                  <p className="text-xs text-muted-foreground">{competenciaShortLabelBR(r.competencia)}</p>
                </button>
                <div onClick={(e) => e.stopPropagation()}>{actions(r)}</div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <span className="text-muted-foreground">Realizado: <b className="text-foreground">{formatIndicatorValue(r.realizado, def, { compact: true })}</b></span>
                <span className="text-muted-foreground">Meta: <b className="text-foreground">{formatIndicatorValue(r.meta, def, { compact: true })}</b></span>
                <span className="text-muted-foreground">Atingimento: <b className="text-foreground">{r.atingimento != null ? formatPercentBR(r.atingimento, 1) : '—'}</b></span>
                <span className="text-muted-foreground">Desvio: <b className="text-foreground">{formatIndicatorDeviation(r.desvio, def, { compact: true })}</b></span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <GeneralIndicatorStatusBadge situacao={r.situacao} />
                <GeneralIndicatorQualityBadge signals={r.quality} />
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
