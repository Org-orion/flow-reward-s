import { formatCurrencyBRL, formatNumberBR, formatPercentBR } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import {
  diffBonusPercentualParams,
  type BonusPercentualCompareInput,
  type BonusPercentualDiffRow,
} from '../domain/bonusPercentualComparacao';

interface Props { atual: BonusPercentualCompareInput; nova: BonusPercentualCompareInput; labelA?: string; labelB?: string }

function fmt(v: number | null, kind: BonusPercentualDiffRow['kind']): string {
  if (v == null) return kind === 'percent' ? 'Sem teto' : '—';
  if (kind === 'currency') return formatCurrencyBRL(v);
  if (kind === 'percent') return formatPercentBR(v);
  return formatNumberBR(v);
}

/** Comparação de parâmetros (atual × nova) com delta absoluto e percentual. */
export function BonusPercentualComparison({ atual, nova, labelA = 'Atual', labelB = 'Nova' }: Props) {
  const diff = diffBonusPercentualParams(atual, nova);
  return (
    <div className="overflow-x-auto rounded-lg border border-border/70">
      <table className="w-full min-w-[360px] text-sm">
        <thead>
          <tr className="bg-muted/50 text-left">
            <th className="px-3 py-1.5 font-medium">Parâmetro</th>
            <th className="px-3 py-1.5 text-right font-medium">{labelA}</th>
            <th className="px-3 py-1.5 text-right font-medium">{labelB}</th>
            <th className="px-3 py-1.5 text-right font-medium">Δ</th>
          </tr>
        </thead>
        <tbody>
          {diff.map(d => (
            <tr key={d.key} className={cn('border-t border-border/50', d.changed && 'bg-status-warning/5')}>
              <td className="px-3 py-1.5 text-foreground">{d.label}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{fmt(d.a, d.kind)}</td>
              <td className={cn('px-3 py-1.5 text-right tabular-nums', d.changed && 'font-semibold text-status-warning')}>{fmt(d.b, d.kind)}</td>
              <td className="px-3 py-1.5 text-right text-xs tabular-nums text-muted-foreground">
                {d.deltaAbs != null && d.deltaAbs !== 0
                  ? `${d.deltaAbs > 0 ? '+' : ''}${d.kind === 'currency' ? formatCurrencyBRL(d.deltaAbs) : formatNumberBR(d.deltaAbs)}${d.deltaPct != null ? ` (${d.deltaPct > 0 ? '+' : ''}${d.deltaPct}%)` : ''}`
                  : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
