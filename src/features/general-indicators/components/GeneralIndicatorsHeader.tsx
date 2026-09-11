import { BarChart3, RefreshCw, Plus, Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { competenciaLabelLong } from '@/features/dashboard/utils/dates';
import { formatDateTimeBR } from '@/lib/dateTime';

interface Props {
  competencia: string;
  indicadoresCount: number;
  lastUpdated: Date | null;
  refreshing: boolean;
  onRefresh: () => void;
  onRegister: () => void;
  /** Permissão de criar registro (ver src/config/permissions.ts). */
  podeCriar?: boolean;
  children?: ReactNode; // navegação + seletor de competência + comparação
}

/**
 * Cabeçalho compacto da Central de Indicadores Corporativos. Registrar indicador
 * é ação SECUNDÁRIA (não há mais formulário permanente no topo).
 */
export function GeneralIndicatorsHeader({
  competencia, indicadoresCount, lastUpdated, refreshing, onRefresh, onRegister, children, podeCriar = true,
}: Props) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card px-5 py-4 shadow-[var(--shadow-card)]">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/10">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight tracking-tight text-foreground">Indicadores Corporativos</h1>
              <p className="text-xs text-muted-foreground">
                Visão consolidada dos principais indicadores operacionais
                {competencia ? ` · ${competenciaLabelLong(competencia)}` : ''} · {indicadoresCount} indicador(es)
                {lastUpdated ? ` · atualizado em ${formatDateTimeBR(lastUpdated)}` : ''}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={onRefresh} disabled={refreshing}>
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Atualizar
            </Button>
            {podeCriar && (
              <Button size="sm" className="h-8 gap-1.5" onClick={onRegister}>
                <Plus className="h-4 w-4" /> Registrar indicador
              </Button>
            )}
          </div>
        </div>

        {children && <div className="border-t border-border/60 pt-3">{children}</div>}
      </div>
    </div>
  );
}
