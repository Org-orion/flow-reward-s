import { Pencil, Users, ClipboardEdit, History } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { formatNumberBR, formatPercentBR, pluralizeBR } from '@/lib/formatters';
import { formatDateBR } from '@/lib/dateTime';
import { DssLocationStatus } from './DssLocationStatus';
import type { DssLocationRow } from '../types/dss-location.types';
import { useResourceAccess } from '@/hooks/useResourceAccess';

interface Props {
  row: DssLocationRow | null;
  onClose: () => void;
  onEdit: (r: DssLocationRow) => void;
  onVerFuncionarios: (r: DssLocationRow) => void;
  onRegistrarDss: (r: DssLocationRow) => void;
  onVerHistorico: (r: DssLocationRow) => void;
}

export function DssLocationDrawer({ row, onClose, onEdit, onVerFuncionarios, onRegistrarDss, onVerHistorico }: Props) {
  const acesso = useResourceAccess('cad_locais_dss');
  if (!row) return <Sheet open={false} onOpenChange={() => {}}><SheetContent /></Sheet>;
  const r = row;
  const u = r.usage;
  return (
    <Sheet open={!!row} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-[540px]">
        <SheetHeader className="border-b border-border/60 px-5 py-4">
          <SheetTitle className="truncate">{r.nome}</SheetTitle>
          <div className="mt-1"><DssLocationStatus status={r.status} /></div>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {r.mostrarDescricao && (
            <Section label="Informações"><p className="text-sm text-foreground">{r.descricao}</p></Section>
          )}

          <Section label="Cobertura">
            <div className="grid grid-cols-3 gap-2 text-center">
              <Mini label="Funcionários" value={u.funcionarios} />
              <Mini label="Ativos" value={u.funcionariosAtivos} />
              <Mini label="Inativos" value={u.funcionariosInativos} />
            </div>
          </Section>

          <Section label="Histórico">
            <div className="space-y-1 text-sm">
              <Line k="DSS realizados" v={formatNumberBR(u.dssRealizados)} />
              <Line k="Registros de presença" v={formatNumberBR(u.presencas)} />
              <Line k="Última realização" v={u.ultimaData ? formatDateBR(u.ultimaData) : 'Nenhum DSS realizado'} />
              {u.dssRealizados > 0 && <Line k="Presença média por DSS" v={pluralizeBR(u.presencaMedia, 'presente', 'presentes')} />}
              {u.participacaoMediaPct != null && <Line k="Participação média (aprox.)" v={formatPercentBR(u.participacaoMediaPct, 0)} />}
            </div>
          </Section>

          {u.ultimosDss.length > 0 && (
            <Section label="Últimos DSS">
              <ul className="space-y-1.5">
                {u.ultimosDss.map(d => (
                  <li key={d.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate text-foreground">{d.titulo}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatDateBR(d.data)} · {pluralizeBR(d.presentes, 'presente', 'presentes')}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {r.status.motivos.length > 0 && (
            <div className="rounded-xl border border-status-warning/40 bg-status-warning/5 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-status-warning">Pontos a revisar</p>
              <ul className="mt-1.5 space-y-0.5 text-sm text-foreground">{r.status.motivos.map((m, i) => <li key={i}>{m}</li>)}</ul>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {u.funcionarios > 0 && <Button variant="outline" className="w-full justify-start gap-2" onClick={() => onVerFuncionarios(r)}><Users className="h-4 w-4" /> Ver funcionários</Button>}
            <Button variant="outline" className="w-full justify-start gap-2" onClick={() => onRegistrarDss(r)}><ClipboardEdit className="h-4 w-4" /> Registrar novo DSS</Button>
            {u.temHistorico && <Button variant="outline" className="w-full justify-start gap-2" onClick={() => onVerHistorico(r)}><History className="h-4 w-4" /> Ver histórico de DSS</Button>}
          </div>
        </div>

        <div className="border-t border-border/60 px-5 py-3">
          {acesso.podeEditar && (
            <Button className="w-full gap-1.5" onClick={() => onEdit(r)}><Pencil className="h-4 w-4" /> Editar local</Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="rounded-lg border border-border/70 p-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><div className="mt-1.5">{children}</div></div>;
}
function Line({ k, v }: { k: string; v: string }) {
  return <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">{k}</span><span className="font-medium tabular-nums text-foreground">{v}</span></div>;
}
function Mini({ label, value }: { label: string; value: number }) {
  return <div className="rounded-lg border border-border/60 bg-muted/20 p-2"><p className="text-base font-bold tabular-nums text-foreground">{formatNumberBR(value)}</p><p className="text-[11px] text-muted-foreground">{label}</p></div>;
}
