import { Calculator, CalendarPlus } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { formatCurrencyBRL, formatNumberBR, formatPercentBR, pluralizeBR } from '@/lib/formatters';
import { formatDateTimeBR } from '@/lib/dateTime';
import { kitsExemplo } from '../domain/bonusPercentualCalculo';
import { toCalculoInput } from '../domain/bonusPercentualRow';
import { bonusPercentualProtectionReason } from '../domain/bonusPercentualProtecao';
import { BonusPercentualStatus } from './BonusPercentualStatus';
import { BonusPercentualBreakdown } from './BonusPercentualBreakdown';
import { BonusPercentualScale } from './BonusPercentualScale';
import { periodLabel, vigenciaLabel } from './periodLabel';
import type { BonusPercentualRow } from '../types/bonus-percentual.types';

interface Props {
  row: BonusPercentualRow | null;
  onClose: () => void;
  onSimular: (r: BonusPercentualRow) => void;
  onNovaVigencia: (r: BonusPercentualRow) => void;
}

export function BonusPercentualDrawer({ row, onClose, onSimular, onNovaVigencia }: Props) {
  if (!row) return <Sheet open={false} onOpenChange={() => {}}><SheetContent /></Sheet>;
  const r = row;
  const cfg = toCalculoInput(r);
  const protecao = bonusPercentualProtectionReason(r.state.state, r.usage);

  return (
    <Sheet open={!!row} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-[540px]">
        <SheetHeader className="border-b border-border/60 px-5 py-4">
          <SheetTitle className="truncate">{vigenciaLabel(r)}</SheetTitle>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <BonusPercentualStatus state={r.state} />
            <span className="text-xs text-muted-foreground">{periodLabel(r)}</span>
          </div>
          {r.sentinela && <p className="mt-1 text-[11px] text-muted-foreground">Vigência técnica: {r.vigenciaInicio} (regra inicial / desde sempre).</p>}
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <Section label="Parâmetros">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Line k="Meta de kits" v={formatNumberBR(r.metaKits)} />
              <Line k="Bônus da meta" v={formatCurrencyBRL(r.bonusMeta)} />
              <Line k="Bloco de kits" v={`${formatNumberBR(r.blocoKits)} = 100%`} />
              <Line k="Valor por bloco" v={formatCurrencyBRL(r.valorBloco)} />
              <Line k="Percentual máximo" v={r.percentualMaximo != null ? `${formatPercentBR(r.percentualMaximo)} (aplicado)` : 'Sem teto'} />
            </div>
          </Section>

          <Section label="Fórmula">
            <p className="text-sm text-foreground">
              Percentual = (kits − meta) ÷ bloco. Adicional = percentual × valor do bloco. Total = bônus da meta +
              adicional. Frações de bloco contam proporcionalmente.
            </p>
          </Section>

          <Section label={`Exemplo — ${formatNumberBR(kitsExemplo(cfg))} kits`}>
            <BonusPercentualBreakdown kits={kitsExemplo(cfg)} config={cfg} />
          </Section>

          <Section label="Escala percentual">
            <BonusPercentualScale config={cfg} />
          </Section>

          <Section label="Utilização">
            <p className="text-sm text-foreground">
              {r.usage.utilizada
                ? `${pluralizeBR(r.usage.competencias, 'competência remunerada', 'competências remuneradas')} · ${pluralizeBR(r.usage.resultados, 'resultado', 'resultados')}.`
                : 'Nenhum processamento registrado com esta regra.'}
            </p>
          </Section>

          <Section label="Trilha">
            <div className="space-y-1 text-sm">
              <Line k="Criada em" v={r.createdAt ? formatDateTimeBR(r.createdAt) : '—'} />
              <Line k="Atualizada em" v={r.updatedAt ? formatDateTimeBR(r.updatedAt) : '—'} />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {protecao ?? 'Regra programada e não utilizada — ainda pode ser editada.'}
            </p>
          </Section>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="justify-start gap-2" onClick={() => onSimular(r)}><Calculator className="h-4 w-4" /> Simular</Button>
            <Button className="justify-start gap-2" onClick={() => onNovaVigencia(r)}><CalendarPlus className="h-4 w-4" /> Nova vigência</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="rounded-lg border border-border/70 p-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><div className="mt-1.5">{children}</div></div>;
}
function Line({ k, v }: { k: string; v: string }) {
  return <div className="flex items-center justify-between gap-2"><span className="text-muted-foreground">{k}</span><span className="font-medium tabular-nums text-foreground">{v}</span></div>;
}
