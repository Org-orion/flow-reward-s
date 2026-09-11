import { Pencil, Users, GitCompare, AlertTriangle, Info } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { pluralizeBR, formatNumberBR } from '@/lib/formatters';
import { FunctionRegistrationStatus } from './FunctionRegistrationStatus';
import { FunctionUsage } from './FunctionUsage';
import type { FunctionRow } from '../types/function.types';
import { useResourceAccess } from '@/hooks/useResourceAccess';

interface Props {
  row: FunctionRow | null;
  onClose: () => void;
  onEdit: (r: FunctionRow) => void;
  onVerFuncionarios: (r: FunctionRow) => void;
  onCompare: (r: FunctionRow) => void;
}

export function FunctionDrawer({ row, onClose, onEdit, onVerFuncionarios, onCompare }: Props) {
  const acesso = useResourceAccess('cad_funcoes');
  if (!row) return <Sheet open={false} onOpenChange={() => {}}><SheetContent /></Sheet>;
  const r = row;
  const temCorrespondencia = r.status.status === 'possivel_correspondencia';
  return (
    <Sheet open={!!row} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-[520px]">
        <SheetHeader className="border-b border-border/60 px-5 py-4">
          <SheetTitle className="truncate">{r.nome}</SheetTitle>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <FunctionRegistrationStatus status={r.status} />
            <FunctionUsage usage={r.usage} />
          </div>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <Mini label="Funcionários" value={r.usage.funcionarios} />
            <Mini label="Setores" value={r.usage.setores} />
            <Mini label="Empresas" value={r.usage.empresas} />
          </div>

          <div className="rounded-lg border border-border/70 p-3 text-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Utilização</p>
            <p className="mt-1 text-foreground">
              {r.usage.emUso
                ? `${pluralizeBR(r.usage.funcionarios, 'funcionário vinculado', 'funcionários vinculados')} atualmente.`
                : r.usage.somenteHistorico ? 'Sem funcionários atuais, mas com histórico de premiação.' : 'Sem funcionários vinculados.'}
            </p>
            {r.usage.resultadosHistoricos > 0 && <p className="mt-0.5 text-xs text-muted-foreground">{pluralizeBR(r.usage.resultadosHistoricos, 'resultado histórico', 'resultados históricos')} com este nome.</p>}
          </div>

          {r.usage.topSetores.length > 0 && (
            <div className="rounded-lg border border-border/70 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Principais setores</p>
              <ul className="mt-1.5 space-y-1">
                {r.usage.topSetores.map(s => (
                  <li key={s.nome} className="flex items-center justify-between text-sm">
                    <span className="truncate text-foreground">{s.nome}</span>
                    <span className="ml-2 shrink-0 tabular-nums text-muted-foreground">{formatNumberBR(s.funcionarios)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(temCorrespondencia || r.status.motivos.length > 0) && (
            <div className={temCorrespondencia ? 'rounded-xl border border-status-warning/40 bg-status-warning/5 p-3' : 'rounded-xl border border-border/70 bg-muted/20 p-3'}>
              <p className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${temCorrespondencia ? 'text-status-warning' : 'text-muted-foreground'}`}>
                {temCorrespondencia ? <AlertTriangle className="h-3.5 w-3.5" /> : <Info className="h-3.5 w-3.5" />} Qualidade cadastral
              </p>
              <ul className="mt-1.5 space-y-0.5 text-sm text-foreground">
                {r.status.motivos.map((m, i) => <li key={i}>{m}</li>)}
              </ul>
              {temCorrespondencia && r.similar.length > 0 && (
                <Button variant="outline" size="sm" className="mt-2 h-7 gap-1.5 text-xs" onClick={() => onCompare(r)}>
                  <GitCompare className="h-3.5 w-3.5" /> Comparar funções
                </Button>
              )}
            </div>
          )}

          <Button variant="outline" className="w-full justify-start gap-2" onClick={() => onVerFuncionarios(r)}>
            <Users className="h-4 w-4" /> Ver funcionários desta função
          </Button>
        </div>

        <div className="border-t border-border/60 px-5 py-3">
          {acesso.podeEditar && (
            <Button className="w-full gap-1.5" onClick={() => onEdit(r)}><Pencil className="h-4 w-4" /> Editar função</Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-2">
      <p className="text-base font-bold tabular-nums text-foreground">{formatNumberBR(value)}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
