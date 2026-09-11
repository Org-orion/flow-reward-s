import { Pencil, LineChart, Info } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/app/StatusBadge';
import { formatNumberBR, formatPercentBR, pluralizeBR } from '@/lib/formatters';
import { formatMonthYearBR } from '@/lib/dateTime';
import { formatTypeValue } from '../domain/generalIndicatorValueFormatting';
import { GeneralIndicatorTypeCode } from './GeneralIndicatorTypeCode';
import { GeneralIndicatorTypeStatus } from './GeneralIndicatorTypeStatus';
import type { GeneralIndicatorTypeRow } from '../types/general-indicator-type.types';
import { useResourceAccess } from '@/hooks/useResourceAccess';

interface Props {
  row: GeneralIndicatorTypeRow | null;
  onClose: () => void;
  onEdit: (r: GeneralIndicatorTypeRow) => void;
  onVerMedicoes: (r: GeneralIndicatorTypeRow) => void;
}

export function GeneralIndicatorTypeDrawer({ row, onClose, onEdit, onVerMedicoes }: Props) {
  const acesso = useResourceAccess('cad_tipos_indicadores_gerais');
  if (!row) return <Sheet open={false} onOpenChange={() => {}}><SheetContent /></Sheet>;
  const r = row;
  const u = r.usage;
  const def = r.definition;
  return (
    <Sheet open={!!row} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-[520px]">
        <SheetHeader className="border-b border-border/60 px-5 py-4">
          <div className="flex items-center gap-2">
            <GeneralIndicatorTypeCode codigo={r.codigo} />
            <SheetTitle className="truncate">{r.nome}</SheetTitle>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <StatusBadge variant={r.ativo ? 'success' : 'neutral'}>{r.ativo ? 'Ativo' : 'Inativo'}</StatusBadge>
            <GeneralIndicatorTypeStatus status={r.status} />
          </div>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <Section label="Definição">
            <Line k="Código" vNode={<span className="font-mono">{r.codigo}</span>} />
            <Line k="Nome" v={r.nome} />
            {r.descricao && r.descricao.trim() && <Line k="Descrição" v={r.descricao} />}
            <Line k="Formato" v={def.format === 'currency' ? 'Moeda (BRL)' : def.format === 'integer' || def.format === 'quantity' ? `Número${def.unit ? ` (${def.unit})` : ''}` : def.format === 'percent' ? 'Percentual' : 'Decimal'} />
          </Section>

          <div className="grid grid-cols-3 gap-2 text-center">
            <Mini label="Medições" value={u.medicoes} />
            <Mini label="Competências" value={u.competencias} />
            <MiniText label="Última" value={u.ultimaCompetencia ? formatMonthYearBR(u.ultimaCompetencia) : '—'} />
          </div>

          {u.medicoes > 0 && (
            <Section label="Último resultado">
              <Line k="Meta" v={formatTypeValue(u.ultimoMeta, def)} />
              <Line k="Realizado" v={formatTypeValue(u.ultimoRealizado, def)} />
              <Line k="Atingimento" v={u.ultimoPercentual != null ? formatPercentBR(u.ultimoPercentual, 0) : '—'} />
            </Section>
          )}

          <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Info className="h-3.5 w-3.5" /> Regras relacionadas</p>
            <p className="mt-1 text-sm text-foreground">A formatação e o uso na premiação são determinados pelo <strong>código</strong> deste indicador. As medições são lançadas em Indicadores Gerais (por competência).</p>
          </div>

          {r.status.motivos.length > 0 && (
            <div className="rounded-xl border border-status-warning/40 bg-status-warning/5 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-status-warning">Pontos a revisar</p>
              <ul className="mt-1.5 space-y-0.5 text-sm text-foreground">{r.status.motivos.map((m, i) => <li key={i}>{m}</li>)}</ul>
            </div>
          )}

          {u.medicoes > 0 && (
            <Button variant="outline" className="w-full justify-start gap-2" onClick={() => onVerMedicoes(r)}><LineChart className="h-4 w-4" /> Ver medições ({pluralizeBR(u.medicoes, 'registro', 'registros')})</Button>
          )}
        </div>

        <div className="border-t border-border/60 px-5 py-3">
          {acesso.podeEditar && (
            <Button className="w-full gap-1.5" onClick={() => onEdit(r)}><Pencil className="h-4 w-4" /> Editar indicador</Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="rounded-lg border border-border/70 p-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><div className="mt-1.5 space-y-1">{children}</div></div>;
}
function Line({ k, v, vNode }: { k: string; v?: string; vNode?: React.ReactNode }) {
  return <div className="flex items-start justify-between gap-3 text-sm"><span className="shrink-0 text-muted-foreground">{k}</span><span className="text-right font-medium text-foreground">{vNode ?? v}</span></div>;
}
function Mini({ label, value }: { label: string; value: number }) {
  return <div className="rounded-lg border border-border/60 bg-muted/20 p-2"><p className="text-base font-bold tabular-nums text-foreground">{formatNumberBR(value)}</p><p className="text-[11px] text-muted-foreground">{label}</p></div>;
}
function MiniText({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-border/60 bg-muted/20 p-2"><p className="truncate text-sm font-bold text-foreground">{value}</p><p className="text-[11px] text-muted-foreground">{label}</p></div>;
}
