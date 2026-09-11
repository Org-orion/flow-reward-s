import { AlertTriangle, Save, UploadCloud, Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { competenciaLabelLong } from '@/features/dashboard/utils/dates';
import { formatDateTimeBR } from '@/lib/dateTime';
import { useResourceAccess } from '@/hooks/useResourceAccess';

interface OccurrencesHeaderProps {
  competencia: string;
  funcionariosCount: number;
  lastSaved: Date | null;
  isDirty: boolean;
  changedCount: number;
  saving: boolean;
  onImport: () => void;
  onSave: () => void;
  children?: ReactNode; // navegação + seletor de competência
}

/** Cabeçalho global compacto: título, contexto operacional, ações e navegação. */
export function OccurrencesHeader({
  competencia, funcionariosCount, lastSaved, isDirty, changedCount, saving, onImport, onSave, children,
}: OccurrencesHeaderProps) {
  const acesso = useResourceAccess('faltas_advertencias');
  const savedLabel = lastSaved ? formatDateTimeBR(lastSaved) : null;

  return (
    <div className="rounded-2xl border border-border/70 bg-card px-5 py-4 shadow-[var(--shadow-card)]">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/10">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight tracking-tight text-foreground">Apuração de Faltas e Advertências</h1>
              <p className="text-xs text-muted-foreground">
                {competencia ? competenciaLabelLong(competencia) : ''} · {funcionariosCount} funcionário(s)
                {savedLabel ? ` · salvo às ${savedLabel}` : ''}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isDirty && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-status-warning/10 px-2.5 py-1 text-xs font-medium text-status-warning">
                <span className="h-1.5 w-1.5 rounded-full bg-status-warning" /> {changedCount} alteração(ões) não salva(s)
              </span>
            )}
            {acesso.podeImportar && (
              <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={onImport}>
                <UploadCloud className="h-4 w-4" /> Importar
              </Button>
            )}
            {acesso.podeEditar && (
            <Button size="sm" className="h-8 gap-1.5" onClick={onSave} disabled={!isDirty || saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
            )}
          </div>
        </div>

        {children && <div className="border-t border-border/60 pt-3">{children}</div>}
      </div>
    </div>
  );
}
