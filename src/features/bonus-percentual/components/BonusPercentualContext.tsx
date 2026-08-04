import { Percent, CalendarClock, History, CalendarPlus } from 'lucide-react';
import { pluralizeBR } from '@/lib/formatters';
import { competenciaLabelLong } from '@/features/dashboard/utils/dates';
import { vigenciaLabel } from './periodLabel';
import type { BonusPercentualRow } from '../types/bonus-percentual.types';

interface Props { rows: BonusPercentualRow[]; atual: BonusPercentualRow | null; proxima: BonusPercentualRow | null }

/** Faixa compacta de contexto (poucos registros — sem cards grandes). */
export function BonusPercentualContext({ rows, atual, proxima }: Props) {
  const programadas = rows.filter(r => r.state.state === 'programada').length;
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-border/70 bg-card px-4 py-3 text-sm shadow-[var(--shadow-card)]">
      <Item icon={Percent} label={pluralizeBR(rows.length, 'configuração', 'configurações')} />
      <Sep />
      <Item icon={CalendarClock} label={`Regra atual: ${atual ? vigenciaLabel(atual) : '—'}`} tone="gold" />
      <Sep />
      <Item icon={CalendarPlus} label={pluralizeBR(programadas, 'alteração programada', 'alterações programadas')} tone={programadas > 0 ? 'warn' : undefined} />
      <Sep />
      <Item icon={History} label={`Próxima vigência: ${proxima ? competenciaLabelLong(proxima.vigenciaInicio) : '—'}`} />
    </div>
  );
}

function Item({ icon: Icon, label, tone }: { icon: typeof Percent; label: string; tone?: 'gold' | 'warn' }) {
  const cls = tone === 'gold' ? 'text-[#7a5f16]' : tone === 'warn' ? 'text-status-warning' : 'text-foreground';
  return <span className={`inline-flex items-center gap-1.5 ${cls}`}><Icon className="h-4 w-4 text-muted-foreground/70" /> {label}</span>;
}
function Sep() { return <span className="hidden h-4 w-px bg-border/70 sm:inline-block" aria-hidden />; }
