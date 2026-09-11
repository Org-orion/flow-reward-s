import { Percent, Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { useResourceAccess } from '@/hooks/useResourceAccess';

interface Props { onNovaConfig: () => void; children?: ReactNode }

export function BonusPercentualHeader({ onNovaConfig, children }: Props) {
  const acesso = useResourceAccess('cad_bonus_percentual');
  return (
    <div className="rounded-2xl border border-border/70 bg-card px-5 py-4 shadow-[var(--shadow-card)]">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#c8a83f]/15 text-[#7a5f16] ring-1 ring-[#c8a83f]/25">
              <Percent className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight tracking-tight text-foreground">Bônus Percentual por Kits</h1>
              <p className="text-xs text-muted-foreground">Adicional proporcional que passa a valer depois de a meta de kits ser batida.</p>
            </div>
          </div>
          {acesso.podeCriar && (
            <Button size="sm" className="h-8 gap-1.5" onClick={onNovaConfig}><Plus className="h-4 w-4" /> Nova configuração</Button>
          )}
        </div>
        {children && <div className="border-t border-border/60 pt-3">{children}</div>}
      </div>
    </div>
  );
}
