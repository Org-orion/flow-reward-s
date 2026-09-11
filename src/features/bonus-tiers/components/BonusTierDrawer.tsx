import { Pencil, Share2, AlertTriangle, Info } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { formatCurrencyBRL, pluralizeBR } from '@/lib/formatters';
import { BonusTierRegistrationStatus } from './BonusTierRegistrationStatus';
import type { BonusTierRow } from '../types/bonus-tier.types';
import { useResourceAccess } from '@/hooks/useResourceAccess';

interface Props {
  row: BonusTierRow | null;
  onClose: () => void;
  onEdit: (r: BonusTierRow) => void;
  onVinculos: (r: BonusTierRow) => void;
}

function qualidadeMsg(row: BonusTierRow): { tone: 'info' | 'warn'; text: string } | null {
  const a = row.nameAnalysis;
  if (a.state === 'consistente') return { tone: 'info', text: `O nome da faixa contém ${formatCurrencyBRL(a.valorNoNome ?? 0)} e o valor cadastrado também é ${formatCurrencyBRL(row.valor)}.` };
  if (a.state === 'divergente') return { tone: 'warn', text: `O nome da faixa contém ${formatCurrencyBRL(a.valorNoNome ?? 0)}, mas o valor cadastrado é ${formatCurrencyBRL(row.valor)}.` };
  if (a.state === 'nao_interpretavel') return { tone: 'warn', text: 'O nome contém um valor monetário não interpretável.' };
  return null;
}

export function BonusTierDrawer({ row, onClose, onEdit, onVinculos }: Props) {
  const acesso = useResourceAccess('cad_faixas');
  if (!row) return <Sheet open={false} onOpenChange={() => {}}><SheetContent /></Sheet>;
  const r = row;
  const q = qualidadeMsg(r);
  return (
    <Sheet open={!!row} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-[520px]">
        <SheetHeader className="border-b border-border/60 px-5 py-4">
          <SheetTitle className="truncate">{r.nome}</SheetTitle>
          <div className="mt-1 flex items-center gap-3">
            <span className="text-lg font-bold tabular-nums text-[#7a5f16]">{formatCurrencyBRL(r.valor)}</span>
            <BonusTierRegistrationStatus status={r.status} />
          </div>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <Mini label="Funcionários" value={r.usage.funcionarios} />
            <Mini label="Categorias" value={r.usage.categorias} />
            <Mini label="Bases" value={r.usage.bases} />
          </div>

          <div className="rounded-lg border border-border/70 p-3 text-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Utilização</p>
            <p className="mt-1 text-foreground">{r.usage.emUso ? `${pluralizeBR(r.usage.funcionarios, 'funcionário vinculado', 'funcionários vinculados')}.` : 'Sem funcionários vinculados.'}</p>
            {r.usage.resultadosHistoricos > 0 && <p className="mt-0.5 text-xs text-muted-foreground">{pluralizeBR(r.usage.resultadosHistoricos, 'resultado histórico', 'resultados históricos')} com este nome.</p>}
          </div>

          {q && (
            <div className={q.tone === 'warn' ? 'rounded-xl border border-status-warning/40 bg-status-warning/5 p-3' : 'rounded-xl border border-border/70 bg-muted/20 p-3'}>
              <p className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${q.tone === 'warn' ? 'text-status-warning' : 'text-muted-foreground'}`}>
                {q.tone === 'warn' ? <AlertTriangle className="h-3.5 w-3.5" /> : <Info className="h-3.5 w-3.5" />} Qualidade cadastral
              </p>
              <p className="mt-1 text-sm text-foreground">{q.text}</p>
            </div>
          )}

          {r.status.motivos.length > 0 && (
            <div className="rounded-xl border border-status-warning/30 bg-status-warning/5 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-status-warning">Pontos a revisar</p>
              <ul className="mt-1.5 space-y-0.5 text-sm text-foreground">{r.status.motivos.map((m, i) => <li key={i}>{m}</li>)}</ul>
            </div>
          )}

          <Button variant="outline" className="w-full justify-start gap-2" onClick={() => onVinculos(r)}><Share2 className="h-4 w-4" /> Ver vínculos e utilização</Button>
        </div>

        <div className="border-t border-border/60 px-5 py-3">
          {acesso.podeEditar && (
            <Button className="w-full gap-1.5" onClick={() => onEdit(r)}><Pencil className="h-4 w-4" /> Editar faixa</Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
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
