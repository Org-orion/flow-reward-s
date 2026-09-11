import { Target, ListChecks, MinusCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { pluralizeBR } from '@/lib/formatters';

interface Props {
  count: number;
  onAplicarMetas: () => void;
  onAplicarIndicadores: () => void;
  onMarcarSemMedicao: () => void;
  onCancel: () => void;
  /** Permissão no campo `meta` (ver src/config/permissions.ts). */
  podeAplicarMetas?: boolean;
  /** Permissão no campo `realizado` — também governa "marcar sem medição". */
  podeAplicarIndicadores?: boolean;
}

/** Barra contextual de ações em massa — visível quando há setores selecionados. */
export function SectorIndicatorsBulkBar({
  count, onAplicarMetas, onAplicarIndicadores, onMarcarSemMedicao, onCancel,
  podeAplicarMetas = true, podeAplicarIndicadores = true,
}: Props) {
  if (count === 0) return null;

  return (
    <div className="sticky bottom-4 z-20 flex flex-wrap items-center gap-3 rounded-2xl border border-primary/30 bg-card px-5 py-3.5 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.25)]">
      <span className="text-sm font-semibold text-foreground">{pluralizeBR(count, 'setor selecionado', 'setores selecionados')}</span>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        {podeAplicarMetas && <Button variant="outline" size="sm" className="gap-1.5" onClick={onAplicarMetas}><Target className="h-4 w-4" /> Aplicar metas</Button>}
        {podeAplicarIndicadores && <Button variant="outline" size="sm" className="gap-1.5" onClick={onAplicarIndicadores}><ListChecks className="h-4 w-4" /> Aplicar indicadores</Button>}
        {podeAplicarIndicadores && <Button variant="outline" size="sm" className="gap-1.5" onClick={onMarcarSemMedicao}><MinusCircle className="h-4 w-4" /> Marcar sem medição</Button>}
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={onCancel}><X className="h-4 w-4" /> Cancelar seleção</Button>
      </div>
    </div>
  );
}
