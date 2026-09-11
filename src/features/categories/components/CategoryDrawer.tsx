import { Pencil, Users, Award, Info } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { formatCurrencyBRL, formatNumberBR, pluralizeBR } from '@/lib/formatters';
import { CategoryUsage } from './CategoryUsage';
import type { CategoryRow } from '../types/category.types';
import { useResourceAccess } from '@/hooks/useResourceAccess';

interface Props {
  row: CategoryRow | null;
  onClose: () => void;
  onEdit: (r: CategoryRow) => void;
  onVerFuncionarios: (r: CategoryRow) => void;
}

export function CategoryDrawer({ row, onClose, onEdit, onVerFuncionarios }: Props) {
  const acesso = useResourceAccess('cad_categorias');
  if (!row) return <Sheet open={false} onOpenChange={() => {}}><SheetContent /></Sheet>;
  const r = row;
  const u = r.usage;
  return (
    <Sheet open={!!row} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-[520px]">
        <SheetHeader className="border-b border-border/60 px-5 py-4">
          <SheetTitle className="truncate">{r.nome}</SheetTitle>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <CategoryUsage utilizacao={r.utilizacao} />
            {u.premiavelPorNome && <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"><Award className="h-3 w-3" /> Premiável</span>}
          </div>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <Mini label="Funcionários" value={u.funcionarios} />
            <Mini label="Faixas" value={u.faixas} />
            <Mini label="Bases" value={u.basesIndiretas} />
          </div>

          <Section label="Utilização">
            <p className="text-sm text-foreground">
              {u.emUso ? `${pluralizeBR(u.funcionarios, 'funcionário vinculado', 'funcionários vinculados')} atualmente.`
                : u.somenteHistorico ? 'Sem funcionários atuais, mas com histórico de premiação.' : 'Sem funcionários vinculados.'}
            </p>
            {u.topSetores.length > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">Setores: {u.topSetores.map(s => s.nome).join(', ')}.</p>
            )}
          </Section>

          <Section label="Faixas relacionadas">
            {u.faixasRef.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma faixa vinculada diretamente a esta categoria.</p>
            ) : (
              <ul className="space-y-1">
                {u.faixasRef.map(f => (
                  <li key={f.id} className="flex items-center justify-between text-sm">
                    <span className="truncate text-foreground">{f.nome}</span>
                    <span className="ml-2 shrink-0 font-semibold tabular-nums text-[#7a5f16]">{formatCurrencyBRL(f.valor)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section label="Premiação">
            {u.premiavelPorNome && <p className="text-sm text-foreground">Categoria elegível à premiação (por nome).</p>}
            {u.formulasNomes.length > 0 && <p className="mt-1 text-sm text-foreground">Fórmulas de cálculo: {u.formulasNomes.join(', ')}.</p>}
            {u.topBases.length > 0 && <p className="mt-1 text-xs text-muted-foreground">Bases relacionadas (via funcionários): {u.topBases.map(b => b.nome).join(', ')}.</p>}
            {!u.premiavelPorNome && u.formulasNomes.length === 0 && u.topBases.length === 0 && (
              <p className="text-sm text-muted-foreground">Sem vínculos de premiação identificados.</p>
            )}
          </Section>

          {u.resultadosHistoricos > 0 && (
            <Section label="Histórico">
              <p className="flex items-center gap-1.5 text-sm text-foreground"><Info className="h-3.5 w-3.5 text-muted-foreground" /> {pluralizeBR(u.resultadosHistoricos, 'resultado histórico', 'resultados históricos')} com este nome.</p>
            </Section>
          )}

          <Button variant="outline" className="w-full justify-start gap-2" onClick={() => onVerFuncionarios(r)}>
            <Users className="h-4 w-4" /> Ver funcionários desta categoria
          </Button>
        </div>

        <div className="border-t border-border/60 px-5 py-3">
          {acesso.podeEditar && (
            <Button className="w-full gap-1.5" onClick={() => onEdit(r)}><Pencil className="h-4 w-4" /> Editar categoria</Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/70 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1.5">{children}</div>
    </div>
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
