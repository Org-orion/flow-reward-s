import { Pencil, Share2, FileBarChart, AlertTriangle, Info, Cog } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { formatNumberBR, pluralizeBR } from '@/lib/formatters';
import { formatParameter } from '../domain/rewardBaseFormatting';
import { RewardBaseStatus } from './RewardBaseStatus';
import { RewardBaseTipoBadge } from './RewardBaseParameter';
import { RewardBaseUsage } from './RewardBaseUsage';
import type { RewardBaseRow } from '../types/reward-base.types';
import { useResourceAccess } from '@/hooks/useResourceAccess';

interface Props {
  row: RewardBaseRow | null;
  onClose: () => void;
  onEdit: (r: RewardBaseRow) => void;
  onVinculos: (r: RewardBaseRow) => void;
  onProcessamentos: (r: RewardBaseRow) => void;
}

export function RewardBaseDrawer({ row, onClose, onEdit, onVinculos, onProcessamentos }: Props) {
  const acesso = useResourceAccess('cad_base_premiacao');
  if (!row) return <Sheet open={false} onOpenChange={() => {}}><SheetContent /></Sheet>;
  const r = row;
  const u = r.usage;
  return (
    <Sheet open={!!row} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-[540px]">
        <SheetHeader className="border-b border-border/60 px-5 py-4">
          <SheetTitle className="truncate">{r.nome}</SheetTitle>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <RewardBaseTipoBadge tipo={r.tipo} />
            <span className="text-lg font-bold tabular-nums text-[#7a5f16]">{formatParameter(r.tipo, r.valorBase)}</span>
            <RewardBaseStatus status={r.status} />
          </div>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <Mini label="Funcionários" value={u.funcionarios} />
            <Mini label="Fórmulas" value={u.formulas} />
            <Mini label="Categorias" value={u.categorias} />
          </div>

          {r.descricao && r.descricao.trim() && (
            <Section label="Descrição"><p className="text-sm text-foreground">{r.descricao}</p></Section>
          )}

          {/* Comportamento no motor (derivado do nome) */}
          <div className="rounded-xl border border-[#c8a83f]/40 bg-[#f7f0d7]/40 p-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#8a6d1f]"><Cog className="h-3.5 w-3.5" /> Comportamento no motor</p>
            <p className="mt-1 text-sm text-foreground">{r.engine.label}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">O motor detecta o comportamento pelo <strong>nome</strong> da base.</p>
          </div>

          <Section label="Utilização">
            <p className="text-sm text-foreground">
              {u.emUso ? `${pluralizeBR(u.funcionarios, 'funcionário vinculado', 'funcionários vinculados')}${u.formulas > 0 ? ` · ${pluralizeBR(u.formulas, 'fórmula', 'fórmulas')}` : ''}.`
                : u.somenteHistorico ? 'Sem vínculos atuais, mas com histórico de premiação.' : 'Sem vínculos.'}
            </p>
            {u.topCategorias.length > 0 && <p className="mt-1 text-xs text-muted-foreground">Categorias: {u.topCategorias.map(c => c.nome).join(', ')}.</p>}
            {u.formulasNomes.length > 0 && <p className="mt-0.5 text-xs text-muted-foreground">Fórmulas: {u.formulasNomes.join(', ')}.</p>}
            {u.resultadosHistoricos > 0 && <p className="mt-0.5 text-xs text-muted-foreground">{pluralizeBR(u.resultadosHistoricos, 'resultado histórico', 'resultados históricos')} com esta base.</p>}
          </Section>

          {/* Diferença nome × valor (explicativa) */}
          {r.nameAnalysis.state === 'diferente' && (
            <div className="rounded-xl border border-status-warning/40 bg-status-warning/5 p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-status-warning"><AlertTriangle className="h-3.5 w-3.5" /> Nome × parâmetro</p>
              <p className="mt-1 text-sm text-foreground">Nome: <strong>{r.nome}</strong> · Parâmetro: <strong>{formatParameter(r.tipo, r.valorBase)}</strong>.</p>
              <p className="mt-0.5 text-xs text-muted-foreground">A nomenclatura contém {r.nameAnalysis.percentualNoNome}%, enquanto o valor base é {formatParameter(r.tipo, r.valorBase)}. Essa diferença pode representar conceitos distintos no motor (ex.: multiplicador de kits vs. valor base).</p>
            </div>
          )}

          {r.status.motivos.length > 0 && (
            <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Info className="h-3.5 w-3.5" /> Observações</p>
              <ul className="mt-1.5 space-y-0.5 text-sm text-foreground">{r.status.motivos.map((m, i) => <li key={i}>{m}</li>)}</ul>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button variant="outline" className="w-full justify-start gap-2" onClick={() => onVinculos(r)}><Share2 className="h-4 w-4" /> Ver vínculos e utilização</Button>
            <Button variant="outline" className="w-full justify-start gap-2" onClick={() => onProcessamentos(r)}><FileBarChart className="h-4 w-4" /> Ver processamentos</Button>
          </div>
        </div>

        <div className="border-t border-border/60 px-5 py-3">
          {acesso.podeEditar && (
            <Button className="w-full gap-1.5" onClick={() => onEdit(r)}><Pencil className="h-4 w-4" /> Editar base</Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="rounded-lg border border-border/70 p-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><div className="mt-1.5">{children}</div></div>;
}
function Mini({ label, value }: { label: string; value: number }) {
  return <div className="rounded-lg border border-border/60 bg-muted/20 p-2"><p className="text-base font-bold tabular-nums text-foreground">{formatNumberBR(value)}</p><p className="text-[11px] text-muted-foreground">{label}</p></div>;
}
