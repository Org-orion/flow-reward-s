import { useEffect, useRef, useState } from 'react';
import { Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { formatNumberBR } from '@/lib/formatters';
import { maskNumericInput, parseNumberBR } from '../domain/productionValidation';

interface Props {
  value: number | null;
  changed?: boolean;
  ariaLabel: string;
  onCommit: (value: string) => void;
  /** Enter → avança para o próximo campo (mesma coluna). */
  onEnterNext?: () => void;
  /** Sem permissão para alterar este campo — mostra o valor, não edita. */
  readOnly?: boolean;
}

/**
 * Campo de edição rápida numérico pt-BR. Não salva a cada tecla: mantém texto
 * local e faz commit no blur/Enter. Mostra o número formatado quando não focado.
 * Em `readOnly` (sem permissão no campo) não renderiza input algum — só o valor.
 */
export function ProductionNumberInput({ value, changed, ariaLabel, onCommit, onEnterNext, readOnly }: Props) {
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState('');
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!focused) setText(value == null ? '' : String(value).replace('.', ','));
  }, [value, focused]);

  const display = focused
    ? text
    : value == null ? '' : formatNumberBR(value, Number.isInteger(value) ? 0 : 2);

  if (readOnly) {
    return (
      <span
        aria-label={`${ariaLabel} (somente leitura)`}
        title="Você não tem permissão para alterar este campo."
        className="inline-flex h-8 w-28 items-center justify-end gap-1.5 rounded-md px-3 text-sm tabular-nums text-muted-foreground"
      >
        <Lock className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
        {value == null ? '—' : formatNumberBR(value, Number.isInteger(value) ? 0 : 2)}
      </span>
    );
  }

  return (
    <Input
      ref={ref}
      inputMode="decimal"
      aria-label={ariaLabel}
      value={display}
      placeholder="—"
      onFocus={() => { setFocused(true); setText(value == null ? '' : String(value).replace('.', ',')); }}
      onBlur={() => { setFocused(false); onCommit(text); }}
      onChange={(e) => setText(maskNumericInput(e.target.value))}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onCommit(text);
          ref.current?.blur();
          onEnterNext?.();
        }
      }}
      className={cn(
        'h-8 w-28 text-right tabular-nums',
        changed && 'border-status-warning/60 bg-status-warning/[0.06]',
        parseNumberBR(text) == null && focused && text !== '' && 'border-destructive',
      )}
    />
  );
}
