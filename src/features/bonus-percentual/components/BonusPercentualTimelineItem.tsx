import { formatCurrencyBRL, formatNumberBR, formatPercentBR, pluralizeBR } from '@/lib/formatters';
import { canEditBonusPercentual, canDeleteBonusPercentual } from '../domain/bonusPercentualProtecao';
import { computeBonusPercentual } from '../domain/bonusPercentualCalculo';
import { toCalculoInput } from '../domain/bonusPercentualRow';
import { BonusPercentualStatus } from './BonusPercentualStatus';
import { BonusPercentualActionsMenu } from './BonusPercentualActionsMenu';
import { periodLabel, vigenciaLabel } from './periodLabel';
import type { BonusPercentualRow } from '../types/bonus-percentual.types';

export interface BonusPercentualRowHandlers {
  onOpen: (r: BonusPercentualRow) => void;
  onSimular: (r: BonusPercentualRow) => void;
  onEdit: (r: BonusPercentualRow) => void;
  onNovaVigencia: (r: BonusPercentualRow) => void;
  onDelete: (r: BonusPercentualRow) => void;
}

export function BonusPercentualTimelineItem({ row, handlers }: { row: BonusPercentualRow; handlers: BonusPercentualRowHandlers }) {
  const isAtual = row.state.state === 'atual';
  // Referência rápida: 1 bloco cheio acima da meta = 100%.
  const umBloco = computeBonusPercentual(row.metaKits + row.blocoKits, toCalculoInput(row));

  return (
    <div className={`rounded-xl border bg-card p-4 shadow-[var(--shadow-card)] ${isAtual ? 'border-[#c8a83f]/50' : 'border-border/70'}`}>
      <div className="flex items-start justify-between gap-2">
        <button type="button" onClick={() => handlers.onOpen(row)} className="min-w-0 text-left">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{vigenciaLabel(row)}</span>
            <BonusPercentualStatus state={row.state} />
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{periodLabel(row)}</p>
        </button>
        <div onClick={(e) => e.stopPropagation()}>
          <BonusPercentualActionsMenu
            canEdit={canEditBonusPercentual(row.state.state, row.usage)}
            canDelete={canDeleteBonusPercentual(row.state.state, row.usage)}
            onDetails={() => handlers.onOpen(row)}
            onSimular={() => handlers.onSimular(row)}
            onEdit={() => handlers.onEdit(row)}
            onNovaVigencia={() => handlers.onNovaVigencia(row)}
            onDelete={() => handlers.onDelete(row)}
          />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
        <Param k="Meta" v={`${formatNumberBR(row.metaKits)} kits`} />
        <Param k="Bônus da meta" v={formatCurrencyBRL(row.bonusMeta)} />
        <Param k="Bloco" v={`${formatNumberBR(row.blocoKits)} kits`} />
        <Param k="Valor/bloco" v={formatCurrencyBRL(row.valorBloco)} />
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        {formatNumberBR(row.metaKits + row.blocoKits)} kits →{' '}
        <span className="font-semibold text-[#7a5f16]">{formatPercentBR(umBloco.percentualAplicado)}</span> ·{' '}
        {formatCurrencyBRL(umBloco.bonusTotal)} no total.
        {row.percentualMaximo != null && ` · Teto: ${formatPercentBR(row.percentualMaximo)} (aplicado).`}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {row.usage.utilizada
          ? `Remunerou ${pluralizeBR(row.usage.competencias, 'competência', 'competências')} (${pluralizeBR(row.usage.resultados, 'resultado', 'resultados')}).`
          : 'Sem utilização registrada.'}
      </p>
    </div>
  );
}

function Param({ k, v }: { k: string; v: string }) {
  return <div><span className="text-muted-foreground">{k}: </span><span className="font-medium tabular-nums text-foreground">{v}</span></div>;
}
