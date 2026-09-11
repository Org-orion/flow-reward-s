import { Pencil, Copy, GitCompare, Users, AlertTriangle } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { formatPercentBR, pluralizeBR } from '@/lib/formatters';
import { weightEntries } from '../domain/rewardFormulaWeights';
import { RewardFormulaStatus } from './RewardFormulaStatus';
import { RewardFormulaTotal } from './RewardFormulaTotal';
import { RewardFormulaWeightDistribution } from './RewardFormulaWeightDistribution';
import type { RewardFormulaRow } from '../types/reward-formula.types';
import { useResourceAccess } from '@/hooks/useResourceAccess';

interface Props {
  row: RewardFormulaRow | null;
  onClose: () => void;
  onEdit: (r: RewardFormulaRow) => void;
  onDuplicar: (r: RewardFormulaRow) => void;
  onComparar: (r: RewardFormulaRow) => void;
  onVerUtilizacao: (r: RewardFormulaRow) => void;
}

const pct = (n: number) => formatPercentBR(n, Number.isInteger(n) ? 0 : 1);

export function RewardFormulaDrawer({ row, onClose, onEdit, onDuplicar, onComparar, onVerUtilizacao }: Props) {
  const acesso = useResourceAccess('cad_formulas_calculo');
  if (!row) return <Sheet open={false} onOpenChange={() => {}}><SheetContent /></Sheet>;
  const r = row;
  const entries = weightEntries(r.weights);
  const ativos = entries.filter(e => e.value > 0);
  const zerados = entries.filter(e => e.value === 0);

  return (
    <Sheet open={!!row} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-[560px]">
        <SheetHeader className="border-b border-border/60 px-5 py-4">
          <SheetTitle className="truncate">{r.nome}</SheetTitle>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-foreground">{r.categoriaNome ?? '—'} <span className="text-muted-foreground">·</span> {r.baseNome ?? '—'}</span>
            <RewardFormulaStatus status={r.status} />
          </div>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {r.descricao && r.descricao.trim() && (
            <div className="rounded-lg border border-border/70 p-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Descrição</p><p className="mt-1 text-sm text-foreground">{r.descricao}</p></div>
          )}

          <div className="rounded-lg border border-border/70 p-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Distribuição dos pesos</p>
              <RewardFormulaTotal validation={r.validation} className="text-right" />
            </div>
            <div className="mt-2"><RewardFormulaWeightDistribution weights={r.weights} height="h-2.5" /></div>
          </div>

          <div className="rounded-lg border border-border/70 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Critérios ativos ({ativos.length})</p>
            {ativos.length === 0 ? <p className="mt-1 text-sm text-muted-foreground">Nenhum critério com peso.</p> : (
              <ul className="mt-1.5 space-y-1">
                {ativos.map(e => (
                  <li key={e.key} className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{e.label}</span>
                    <span className="font-semibold tabular-nums text-foreground">{pct(e.value)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {zerados.length > 0 && (
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Critérios sem peso ({zerados.length})</p>
              <p className="mt-1 text-xs text-muted-foreground">{zerados.map(e => e.label).join(' · ')}</p>
            </div>
          )}

          <div className="rounded-lg border border-border/70 p-3 text-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Utilização</p>
            <p className="mt-1 text-foreground">{r.usage.emUso ? `${pluralizeBR(r.usage.funcionarios, 'funcionário atendido', 'funcionários atendidos')} (categoria × base).` : 'Nenhum funcionário na combinação desta fórmula.'}</p>
          </div>

          {r.status.motivos.length > 0 && (
            <div className="rounded-xl border border-status-warning/40 bg-status-warning/5 p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-status-warning"><AlertTriangle className="h-3.5 w-3.5" /> Pontos a revisar</p>
              <ul className="mt-1.5 space-y-0.5 text-sm text-foreground">{r.status.motivos.map((m, i) => <li key={i}>{m}</li>)}</ul>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="justify-start gap-2" onClick={() => onDuplicar(r)}><Copy className="h-4 w-4" /> Duplicar</Button>
            <Button variant="outline" className="justify-start gap-2" onClick={() => onComparar(r)}><GitCompare className="h-4 w-4" /> Comparar</Button>
            {r.usage.emUso && <Button variant="outline" className="col-span-2 justify-start gap-2" onClick={() => onVerUtilizacao(r)}><Users className="h-4 w-4" /> Ver utilização</Button>}
          </div>
        </div>

        <div className="border-t border-border/60 px-5 py-3">
          {acesso.podeEditar && (
            <Button className="w-full gap-1.5" onClick={() => onEdit(r)}><Pencil className="h-4 w-4" /> Editar fórmula</Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
