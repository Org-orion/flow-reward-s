import { Tags, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useResourceAccess } from '@/hooks/useResourceAccess';

interface Props { onNovaCategoria: () => void }

export function CategoriesHeader({ onNovaCategoria }: Props) {
  const acesso = useResourceAccess('cad_categorias');
  return (
    <div className="rounded-2xl border border-border/70 bg-card px-5 py-4 shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/10">
            <Tags className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight tracking-tight text-foreground">Gestão de Categorias</h1>
            <p className="text-xs text-muted-foreground">Organize as categorias usadas na classificação e premiação dos funcionários.</p>
          </div>
        </div>
        {acesso.podeCriar && (
          <Button size="sm" className="h-8 gap-1.5" onClick={onNovaCategoria}><Plus className="h-4 w-4" /> Nova categoria</Button>
        )}
      </div>
    </div>
  );
}
