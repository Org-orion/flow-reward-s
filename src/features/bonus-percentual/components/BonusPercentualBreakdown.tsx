import { AlertTriangle } from 'lucide-react';
import { formatCurrencyBRL, formatNumberBR, formatPercentBR, pluralizeBR } from '@/lib/formatters';
import { computeBonusPercentual, type BonusPercentualInput } from '../domain/bonusPercentualCalculo';

interface Props { kits: number; config: BonusPercentualInput; compact?: boolean }

/**
 * Detalhamento do bônus percentual. O percentual é o número em DESTAQUE e o valor
 * em reais aparece ao lado — o cálculo vem inteiro de `computeBonusPercentual`.
 */
export function BonusPercentualBreakdown({ kits, config, compact }: Props) {
  const b = computeBonusPercentual(kits, config);

  return (
    <div className="space-y-1.5 text-sm">
      <Row k="Quantidade informada" v={`${formatNumberBR(b.kits)} kits`} />
      <Row k="Meta para o bônus" v={`${formatNumberBR(b.meta)} kits`} />

      {!b.atingiuMeta ? (
        <p className="rounded-lg bg-muted/40 p-2 text-muted-foreground">
          Meta não atingida — 0% e nenhum bônus. Faltam {formatNumberBR(b.meta - b.kits)} kits.
        </p>
      ) : (
        <>
          <Row k="Excedente sobre a meta" v={`${formatNumberBR(b.excedente)} kits`} />
          <Row
            k="Bloco de kits"
            v={`${formatNumberBR(b.blocoKits)} kits = 100% = ${formatCurrencyBRL(config.valorBloco)}`}
          />
          {!compact && (
            <Row k="Blocos completos" v={`${pluralizeBR(b.blocosCompletos, 'bloco', 'blocos')} · frações contam`} muted />
          )}
        </>
      )}

      {/* Percentual em destaque + valor em reais ao lado */}
      <div className="mt-2 flex items-stretch gap-2">
        <div className="flex-1 rounded-xl border border-[#c8a83f]/40 bg-[#f7f0d7]/50 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8a6d1f]">Percentual atingido</p>
          <p className="text-2xl font-bold leading-tight tabular-nums text-[#7a5f16]">
            {formatPercentBR(b.percentualAplicado)}
          </p>
        </div>
        <div className="flex-1 rounded-xl border border-border/70 bg-card/60 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Adicional</p>
          <p className="text-2xl font-bold leading-tight tabular-nums text-foreground">{formatCurrencyBRL(b.adicional)}</p>
        </div>
      </div>

      {b.tetoAplicado && (
        <p className="flex items-start gap-1.5 text-xs text-status-warning">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Percentual bruto de {formatPercentBR(b.percentual)} limitado pelo teto de {formatPercentBR(b.percentualMaximo)}.
        </p>
      )}

      <div className="my-1 border-t border-border/60" />
      <Row k="Bônus ao bater a meta" v={formatCurrencyBRL(b.bonusMetaAplicado)} />
      <Row k="Adicional percentual" v={formatCurrencyBRL(b.adicional)} />

      <div className="mt-1 flex items-center justify-between rounded-lg bg-[#f7f0d7]/50 px-2 py-1.5">
        <span className="font-semibold text-[#8a6d1f]">Bônus total</span>
        <span className="text-lg font-bold tabular-nums text-[#7a5f16]">{formatCurrencyBRL(b.bonusTotal)}</span>
      </div>
    </div>
  );
}

function Row({ k, v, muted }: { k: string; v: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{k}</span>
      <span className={muted ? 'text-xs text-muted-foreground' : 'font-medium tabular-nums text-foreground'}>{v}</span>
    </div>
  );
}
