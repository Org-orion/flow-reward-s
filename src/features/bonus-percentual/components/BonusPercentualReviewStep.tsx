import { AlertTriangle, CalendarClock } from 'lucide-react';
import { competenciaLabelLong } from '@/features/dashboard/utils/dates';
import { formatCurrencyBRL, formatNumberBR, formatPercentBR, pluralizeBR } from '@/lib/formatters';
import { BonusPercentualComparison } from './BonusPercentualComparison';
import { BonusPercentualScale } from './BonusPercentualScale';
import { toCompareInput } from '../domain/bonusPercentualRow';
import type { useBonusPercentualEditor } from '../hooks/useBonusPercentualEditor';
import type { BonusPercentualRow } from '../types/bonus-percentual.types';

type Editor = ReturnType<typeof useBonusPercentualEditor>;

interface Props {
  ed: Editor;
  atual: BonusPercentualRow | null;
  competenciaAtual: string;
  retro: { competencias: string[]; resultados: number };
}

export function BonusPercentualReviewStep({ ed, atual, competenciaAtual, retro }: Props) {
  const p = ed.parsed;
  const vigencia = p.vigenciaInicio;
  const retroativa = !!vigencia && vigencia < competenciaAtual;
  const futura = !!vigencia && vigencia > competenciaAtual;

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border/70 p-3 text-sm">
        <p className="font-semibold text-foreground">Vigência: {vigencia ? competenciaLabelLong(vigencia) : '—'}</p>
        <p className="text-muted-foreground">
          Meta {formatNumberBR(p.metaKits ?? 0)} kits · bônus da meta {formatCurrencyBRL(p.bonusMeta ?? 0)} · bloco{' '}
          {formatNumberBR(p.blocoKits ?? 0)} kits = 100% · {formatCurrencyBRL(p.valorBloco ?? 0)} por bloco · teto{' '}
          {p.percentualMaximo != null ? formatPercentBR(p.percentualMaximo) : 'nenhum'}
        </p>
      </div>

      <div className="rounded-lg border border-border/70 p-3">
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Escala percentual resultante</p>
        <BonusPercentualScale config={ed.configPreview} />
      </div>

      {atual && (
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Comparação com a regra atual</p>
          <BonusPercentualComparison atual={toCompareInput(atual)} nova={ed.configPreview} />
        </div>
      )}

      <div className="flex items-start gap-2 rounded-lg border border-border/70 bg-muted/20 p-3 text-sm">
        <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="text-foreground">
          {futura && <>Vigência futura: a regra fica <strong>programada</strong> e passa a valer em {competenciaLabelLong(vigencia)}.</>}
          {!futura && !retroativa && <>Vigência no mês corrente: a regra se torna a <strong>regra vigente</strong> imediatamente.</>}
          {retroativa && <>Vigência retroativa a {competenciaLabelLong(vigencia)}: a regra passa a reger competências passadas.</>}
          {' '}A partir desta vigência, as bases de kits passam a ser remuneradas pelo modelo percentual em vez do modelo
          de faixas. Resultados já salvos não são recalculados sozinhos.
        </p>
      </div>

      {retro.competencias.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-status-warning/40 bg-status-warning/5 p-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-status-warning" />
          <p className="text-foreground">
            {pluralizeBR(retro.competencias.length, 'competência já processada', 'competências já processadas')} ficam sob
            esta regra ({pluralizeBR(retro.resultados, 'resultado', 'resultados')}):{' '}
            {retro.competencias.map(c => competenciaLabelLong(c)).join(', ')}. Reprocessar qualquer uma delas altera os
            valores pagos.
          </p>
        </div>
      )}

      {ed.validation.warnings.length > 0 && (
        <ul className="space-y-0.5 text-xs text-status-warning">{ed.validation.warnings.map((w, i) => <li key={i}>• {w}</li>)}</ul>
      )}
      {ed.validation.errors.length > 0 && (
        <ul className="space-y-0.5 text-xs text-destructive">{ed.validation.errors.map((e, i) => <li key={i}>• {e}</li>)}</ul>
      )}
    </div>
  );
}
