import { FileText, Download, PlayCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { useResourceAccess } from '@/hooks/useResourceAccess';

interface Props {
  onExport: () => void;
  onVerProcessamento?: () => void;
  children?: ReactNode; // navegação
}

/** Cabeçalho compacto do relatório. Exportação e "Ver processamento" à direita. */
export function RewardsReportHeader({ onExport, onVerProcessamento, children }: Props) {
  const acesso = useResourceAccess('relatorio_premiacoes');
  return (
    <div className="rounded-2xl border border-border/70 bg-card px-5 py-4 shadow-[var(--shadow-card)]">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/10">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight tracking-tight text-foreground">Relatório de Premiações</h1>
              <p className="text-xs text-muted-foreground">Consolide, analise, concilie e exporte os resultados já processados.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {onVerProcessamento && (
              <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={onVerProcessamento}>
                <PlayCircle className="h-4 w-4" /> Ver processamento
              </Button>
            )}
            {acesso.podeExportar && (
              <Button size="sm" className="h-8 gap-1.5" onClick={onExport}>
                <Download className="h-4 w-4" /> Exportar relatório
              </Button>
            )}
          </div>
        </div>
        {children && <div className="border-t border-border/60 pt-3">{children}</div>}
      </div>
    </div>
  );
}
