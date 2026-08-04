import { Sparkles, Calculator, CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrencyBRL, formatNumberBR, formatPercentBR } from '@/lib/formatters';
import { BonusPercentualStatus } from './BonusPercentualStatus';
import { BonusPercentualBreakdown } from './BonusPercentualBreakdown';
import { BonusPercentualScale } from './BonusPercentualScale';
import { periodLabel, vigenciaLabel } from './periodLabel';
import { kitsExemplo } from '../domain/bonusPercentualCalculo';
import { toCalculoInput } from '../domain/bonusPercentualRow';
import type { BonusPercentualRow } from '../types/bonus-percentual.types';

interface Props {
  atual: BonusPercentualRow | null;
  proxima: BonusPercentualRow | null;
  onSimular: (r: BonusPercentualRow) => void;
  onNovaVigencia: () => void;
}

/** Painel prioritário da regra vigente + exemplo e escala percentual. */
export function CurrentBonusPercentualRule({ atual, proxima, onSimular, onNovaVigencia }: Props) {
  if (!atual) {
    return (
      <div className="rounded-2xl border border-status-warning/40 bg-status-warning/5 p-4">
        <p className="text-sm font-medium text-status-warning">Nenhuma regra de bônus percentual vigente para a competência atual.</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Cadastre uma configuração com vigência igual ou anterior ao mês corrente para que ela apareça como regra vigente.
        </p>
      </div>
    );
  }

  const cfg = toCalculoInput(atual);
  const exemplo = kitsExemplo(cfg);

  return (
    <div className="rounded-2xl border border-[#c8a83f]/40 bg-gradient-to-br from-[#f7f0d7]/50 to-transparent p-4 shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#7a5f16]" />
          <span className="text-sm font-semibold text-[#7a5f16]">Regra vigente</span>
          <BonusPercentualStatus state={atual.state} />
        </div>
        <span className="text-xs text-muted-foreground">{periodLabel(atual)}</span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Param label="Meta de kits" value={formatNumberBR(atual.metaKits)} />
        <Param label="Bônus ao bater a meta" value={formatCurrencyBRL(atual.bonusMeta)} gold />
        <Param label="Bloco de kits" value={`${formatNumberBR(atual.blocoKits)} = 100%`} />
        <Param label="Valor por bloco (100%)" value={formatCurrencyBRL(atual.valorBloco)} gold />
      </div>

      <p className="mt-2 rounded-xl border border-border/60 bg-card/60 px-3 py-2 text-sm text-foreground">
        A cada <strong>{formatNumberBR(atual.blocoKits)} kits</strong> acima da meta o colaborador acumula{' '}
        <strong className="text-[#7a5f16]">100%</strong> = <strong>{formatCurrencyBRL(atual.valorBloco)}</strong>. O
        percentual é proporcional: metade do bloco vale {formatPercentBR(50)}.
        {atual.percentualMaximo != null && <> Teto de <strong>{formatPercentBR(atual.percentualMaximo)}</strong>.</>}
      </p>

      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-border/70 bg-card/60 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Exemplo — {formatNumberBR(exemplo)} kits
          </p>
          <div className="mt-1"><BonusPercentualBreakdown kits={exemplo} config={cfg} /></div>
        </div>
        <div className="flex flex-col justify-between gap-3">
          <div className="rounded-xl border border-border/70 bg-card/60 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Escala percentual</p>
            <div className="mt-1.5"><BonusPercentualScale config={cfg} /></div>
          </div>
          <div className="rounded-xl border border-border/70 bg-card/60 p-3 text-sm">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <CalendarClock className="h-3.5 w-3.5" /> Próxima alteração
            </p>
            <p className="mt-1 text-foreground">{proxima ? `${vigenciaLabel(proxima)} (programada)` : 'Nenhuma alteração programada.'}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Percentual máximo: {atual.percentualMaximo != null ? `${formatPercentBR(atual.percentualMaximo)} (aplicado)` : 'sem teto'}.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onSimular(atual)}><Calculator className="h-4 w-4" /> Simular</Button>
            <Button size="sm" className="gap-1.5" onClick={onNovaVigencia}>Criar nova vigência</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Param({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/60 p-2.5">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={`text-base font-bold tabular-nums ${gold ? 'text-[#7a5f16]' : 'text-foreground'}`}>{value}</p>
    </div>
  );
}
