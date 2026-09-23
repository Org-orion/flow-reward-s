import { AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TIPO_ALERTA_LABEL, type Alerta } from '../domain/alertas';

/**
 * Alertas do recorte. Não alteram nenhum dado — apontam para lançamentos que já
 * estão gravados exatamente como o Secullum apurou.
 */
export function AlertasPanel({ alertas }: { alertas: Alerta[] }) {
  if (!alertas.length) return null;

  return (
    <div className="grid gap-2 md:grid-cols-2">
      {alertas.map((a) => (
        <div
          key={a.tipo}
          className={cn(
            'flex gap-3 rounded-lg border p-3',
            a.gravidade === 'alta'
              ? 'border-[#c0392b]/30 bg-[#f9e1dd]/60 dark:bg-[#c0392b]/10'
              : 'border-[#d9a520]/40 bg-[#fbf0d5]/60 dark:bg-[#d9a520]/10',
          )}
        >
          {a.gravidade === 'alta'
            ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#c0392b]" />
            : <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#b8860b]" />}
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{TIPO_ALERTA_LABEL[a.tipo]}</p>
            <p className="text-sm font-medium text-foreground">{a.titulo}</p>
            <p className="mt-0.5 break-words text-xs text-muted-foreground">{a.detalhe}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
