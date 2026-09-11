import { Pencil, Users, BarChart3, TrendingUp, AlertTriangle } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { pluralizeBR } from '@/lib/formatters';
import { SectorRegistrationStatus } from './SectorRegistrationStatus';
import type { SectorRow } from '../types/sector.types';
import { useResourceAccess } from '@/hooks/useResourceAccess';

interface Props {
  row: SectorRow | null;
  onClose: () => void;
  onEdit: (r: SectorRow) => void;
  onFuncionarios: (r: SectorRow) => void;
  onProducao: (r: SectorRow) => void;
  onIndicadores: (r: SectorRow) => void;
}

export function SectorDrawer({ row, onClose, onEdit, onFuncionarios, onProducao, onIndicadores }: Props) {
  const acesso = useResourceAccess('cad_setores');
  if (!row) return <Sheet open={false} onOpenChange={() => {}}><SheetContent /></Sheet>;
  const r = row;
  return (
    <Sheet open={!!row} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-[560px]">
        <SheetHeader className="border-b border-border/60 px-5 py-4">
          <SheetTitle className="truncate">{r.nome}</SheetTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">{r.descricaoDisplay.show ? r.descricaoDisplay.text : 'Sem descrição'}</p>
          <div className="mt-1"><SectorRegistrationStatus status={r.status} /></div>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Empresa" value={r.empresaNome ?? 'Não vinculada'} muted={!r.empresaNome} />
            <Field label="Funcionários" value={pluralizeBR(r.links.funcionarios, 'funcionário', 'funcionários')} />
            <Field label="Supervisor" value={r.supervisorNome ?? 'Não definido'} muted={!r.supervisorId} />
            <Field label="Encarregado" value={r.encarregadoNome ?? 'Não definido'} muted={!r.encarregadoId} />
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <Mini label="Funcionários" value={r.links.funcionarios} />
            <Mini label="Produção" value={r.links.producao} />
            <Mini label="Indicadores" value={r.links.indicadores} />
          </div>

          {r.status.pendencias.length > 0 && (
            <div className="rounded-xl border border-status-warning/30 bg-status-warning/5 p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-status-warning"><AlertTriangle className="h-3.5 w-3.5" /> Pendências</p>
              <ul className="mt-1.5 space-y-0.5 text-sm text-foreground">
                {r.status.pendencias.map(p => <li key={p.code}>{p.label}</li>)}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 gap-2">
            <Button variant="outline" className="justify-start gap-2" onClick={() => onFuncionarios(r)}><Users className="h-4 w-4" /> Ver funcionários</Button>
            <Button variant="outline" className="justify-start gap-2" onClick={() => onProducao(r)}><BarChart3 className="h-4 w-4" /> Ver produção do setor</Button>
            <Button variant="outline" className="justify-start gap-2" onClick={() => onIndicadores(r)}><TrendingUp className="h-4 w-4" /> Ver indicadores do setor</Button>
          </div>
        </div>

        <div className="border-t border-border/60 px-5 py-3">
          {acesso.podeEditar && (
            <Button className="w-full gap-1.5" onClick={() => onEdit(r)}><Pencil className="h-4 w-4" /> Editar setor</Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="rounded-lg border border-border/70 p-2.5">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={`mt-0.5 truncate text-sm font-medium ${muted ? 'text-muted-foreground' : 'text-foreground'}`}>{value}</p>
    </div>
  );
}
function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-2">
      <p className="text-base font-bold tabular-nums text-foreground">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
