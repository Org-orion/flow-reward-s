import { Pencil, Network, Users, AlertTriangle, Info } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/app/StatusBadge';
import { formatNumberBR, pluralizeBR } from '@/lib/formatters';
import { formatCNPJ } from '../domain/cnpjFormatting';
import { CompanyRegistrationStatus } from './CompanyRegistrationStatus';
import type { CompanyRow } from '../types/company.types';
import { useResourceAccess } from '@/hooks/useResourceAccess';

interface Props {
  row: CompanyRow | null;
  onClose: () => void;
  onEdit: (r: CompanyRow) => void;
  onVerSetores: (r: CompanyRow) => void;
  onVerFuncionarios: (r: CompanyRow) => void;
}

export function CompanyDrawer({ row, onClose, onEdit, onVerSetores, onVerFuncionarios }: Props) {
  const acesso = useResourceAccess('cad_empresas');
  if (!row) return <Sheet open={false} onOpenChange={() => {}}><SheetContent /></Sheet>;
  const r = row;
  const u = r.usage;
  return (
    <Sheet open={!!row} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-[520px]">
        <SheetHeader className="border-b border-border/60 px-5 py-4">
          <SheetTitle className="truncate">{r.nome}</SheetTitle>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <StatusBadge variant={r.ativo ? 'success' : 'neutral'}>{r.ativo ? 'Ativo' : 'Inativo'}</StatusBadge>
            <CompanyRegistrationStatus status={r.status} />
          </div>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <Section label="Informações">
            <Line k="Nome" v={r.nome} />
            <Line k="CNPJ" v={r.cnpjInformado ? formatCNPJ(r.cnpj) : 'Não informado'} warn={r.cnpjInformado && !r.cnpjValido} />
            <Line k="Status" v={r.ativo ? 'Ativo' : 'Inativo'} />
          </Section>

          <div className="grid grid-cols-3 gap-2 text-center">
            <Mini label="Setores" value={u.setores} />
            <Mini label="Funcionários" value={u.funcionarios} />
            <Mini label="Ativos" value={u.funcionariosAtivos} />
          </div>

          <Section label="Utilização">
            <p className="text-sm text-foreground">
              {u.temVinculos ? `${pluralizeBR(u.setores, 'setor', 'setores')} e ${pluralizeBR(u.funcionarios, 'funcionário', 'funcionários')} vinculados.` : 'Sem estrutura vinculada.'}
            </p>
            {u.resultadosHistoricos > 0 && <p className="mt-0.5 text-xs text-muted-foreground">{pluralizeBR(u.resultadosHistoricos, 'resultado histórico', 'resultados históricos')} de premiação (via funcionários).</p>}
          </Section>

          {r.status.motivos.length > 0 && (
            <div className="rounded-xl border border-status-warning/40 bg-status-warning/5 p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-status-warning"><AlertTriangle className="h-3.5 w-3.5" /> Pendências</p>
              <ul className="mt-1.5 space-y-0.5 text-sm text-foreground">{r.status.motivos.map((m, i) => <li key={i}>{m}</li>)}</ul>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button variant="outline" className="w-full justify-start gap-2" onClick={() => onVerSetores(r)}><Network className="h-4 w-4" /> Ver setores</Button>
            <Button variant="outline" className="w-full justify-start gap-2" onClick={() => onVerFuncionarios(r)}><Users className="h-4 w-4" /> Ver funcionários</Button>
          </div>
        </div>

        <div className="border-t border-border/60 px-5 py-3">
          {acesso.podeEditar && (
            <Button className="w-full gap-1.5" onClick={() => onEdit(r)}><Pencil className="h-4 w-4" /> Editar empresa</Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="rounded-lg border border-border/70 p-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><div className="mt-1.5 space-y-1">{children}</div></div>;
}
function Line({ k, v, warn }: { k: string; v: string; warn?: boolean }) {
  return <div className="flex items-center justify-between gap-3 text-sm"><span className="text-muted-foreground">{k}</span><span className={warn ? 'flex items-center gap-1 text-status-warning' : 'text-foreground'}>{warn && <Info className="h-3 w-3" />}{v}</span></div>;
}
function Mini({ label, value }: { label: string; value: number }) {
  return <div className="rounded-lg border border-border/60 bg-muted/20 p-2"><p className="text-base font-bold tabular-nums text-foreground">{formatNumberBR(value)}</p><p className="text-[11px] text-muted-foreground">{label}</p></div>;
}
