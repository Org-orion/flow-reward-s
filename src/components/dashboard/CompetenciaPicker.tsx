import { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { competenciaLabelLong, currentCompetencia } from '@/features/dashboard/utils/dates';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

interface CompetenciaPickerProps {
  value: string;                       // 'YYYY-MM'
  onChange: (value: string) => void;
  className?: string;
  /** Primeiro ano navegável (inclusivo). Ausente = sem limite. */
  minYear?: number;
  /** Último ano navegável (inclusivo). Ausente = sem limite. */
  maxYear?: number;
  /** Texto do botão quando não há valor. */
  placeholder?: string;
}

/** Seletor de competência (mês/ano) em popover — grade de meses com navegação de ano. */
export function CompetenciaPicker({ value, onChange, className, minYear, maxYear, placeholder = 'Selecionar' }: CompetenciaPickerProps) {
  const active = value || currentCompetencia();
  const [selYear, selMonth] = active.split('-').map(Number);
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(selYear || new Date().getFullYear());

  const podeVoltar = minYear === undefined || viewYear > minYear;
  const podeAvancar = maxYear === undefined || viewYear < maxYear;

  const select = (monthIndex: number) => {
    const mm = String(monthIndex + 1).padStart(2, '0');
    onChange(`${viewYear}-${mm}`);
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          const alvo = selYear || new Date().getFullYear();
          const comMin = minYear === undefined ? alvo : Math.max(minYear, alvo);
          setViewYear(maxYear === undefined ? comMin : Math.min(maxYear, comMin));
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn('h-9 w-[170px] justify-start font-normal', className)}>
          <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
          <span className="truncate">{value ? competenciaLabelLong(value) : placeholder}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setViewYear((y) => (minYear === undefined ? y - 1 : Math.max(minYear, y - 1)))}
            disabled={!podeVoltar}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted disabled:pointer-events-none disabled:opacity-30"
            aria-label="Ano anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold text-foreground">{viewYear}</span>
          <button
            type="button"
            onClick={() => setViewYear((y) => (maxYear === undefined ? y + 1 : Math.min(maxYear, y + 1)))}
            disabled={!podeAvancar}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted disabled:pointer-events-none disabled:opacity-30"
            aria-label="Próximo ano"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {MESES.map((m, i) => {
            const isSelected = viewYear === selYear && i + 1 === selMonth;
            return (
              <button
                key={m}
                type="button"
                onClick={() => select(i)}
                className={cn(
                  'rounded-md py-1.5 text-sm font-medium transition-colors',
                  isSelected
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-muted',
                )}
              >
                {m}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
