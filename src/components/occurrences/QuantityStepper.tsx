import { useEffect, useState } from 'react';
import { Lock, Minus, Plus, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { sanitizeQuantity } from '@/features/occurrences/domain/occurrenceValidation';

interface QuantityStepperProps {
  value: number;
  previous?: number;
  onChange: (value: number) => void;
  onRestore?: () => void;
  label: string; // para aria-label, ex.: "Faltas de João Silva"
  className?: string;
  /** Sem permissão para alterar este campo — mostra o valor, não edita. */
  readOnly?: boolean;
}

/** Controle reutilizável de quantidade: [-] valor [+]. Inteiro, nunca negativo, com restauração. */
export function QuantityStepper({ value, previous, onChange, onRestore, label, className, readOnly }: QuantityStepperProps) {
  const [text, setText] = useState(String(value));
  useEffect(() => { setText(String(value)); }, [value]);

  const commit = (raw: string) => onChange(sanitizeQuantity(raw));
  const changed = previous != null && previous !== value;

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') { e.preventDefault(); onChange(value + 1); }
    if (e.key === 'ArrowDown') { e.preventDefault(); onChange(Math.max(0, value - 1)); }
    if (e.key === 'Enter') { e.preventDefault(); commit(text); (e.target as HTMLInputElement).blur(); }
  };

  if (readOnly) {
    return (
      <span
        aria-label={`${label} (somente leitura)`}
        title="Você não tem permissão para alterar este campo."
        className={cn('inline-flex h-7 w-11 items-center justify-center gap-1 rounded-md text-sm font-semibold tabular-nums text-muted-foreground', className)}
      >
        <Lock className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
        {value}
      </span>
    );
  }

  return (
    <div className={cn('inline-flex items-center gap-1', className)}>
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        aria-label={`Diminuir ${label}`}
        className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
        disabled={value <= 0}
      >
        <Minus className="h-3.5 w-3.5" />
      </button>

      <input
        type="text"
        inputMode="numeric"
        value={text}
        onChange={(e) => setText(e.target.value.replace(/[^0-9]/g, ''))}
        onBlur={() => commit(text)}
        onKeyDown={onKeyDown}
        aria-label={label}
        className={cn(
          'h-7 w-11 rounded-md border border-border bg-card text-center text-sm font-semibold tabular-nums outline-none focus:border-primary focus:ring-1 focus:ring-primary/30',
          changed && 'border-status-warning bg-status-warning/[0.08] text-status-warning',
        )}
      />

      <button
        type="button"
        onClick={() => onChange(value + 1)}
        aria-label={`Aumentar ${label}`}
        className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>

      {changed && onRestore && (
        <button
          type="button"
          onClick={onRestore}
          title={`Restaurar valor anterior (${previous})`}
          aria-label={`Restaurar valor anterior de ${label}`}
          className="ml-0.5 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
