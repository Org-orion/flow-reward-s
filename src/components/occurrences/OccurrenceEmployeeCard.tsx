import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { Funcionario } from '@/hooks/useFuncionarios';
import type { OccurrenceEntry, OccurrenceRowKind } from '@/features/occurrences/types';
import { QuantityStepper } from './QuantityStepper';
import { OccurrenceStatusBadge } from './OccurrenceStatusBadge';
import { cn } from '@/lib/utils';
import { useResourceAccess } from '@/hooks/useResourceAccess';

const initialsOf = (nome: string) => nome.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?';

interface Props {
  funcionario: Funcionario;
  entry: OccurrenceEntry;
  baselineEntry: OccurrenceEntry | undefined;
  status: OccurrenceRowKind;
  selected: boolean;
  onToggleSelect: () => void;
  onChangeFaltas: (value: number) => void;
  onChangeAdvertencias: (value: number) => void;
  onRestore: () => void;
}

/** Card de funcionário para mobile — controles grandes, sem tentar espremer a tabela desktop. */
export function OccurrenceEmployeeCard({
  funcionario: f, entry, baselineEntry, status, selected, onToggleSelect, onChangeFaltas, onChangeAdvertencias, onRestore,
}: Props) {
  const acesso = useResourceAccess('faltas_advertencias');
  return (
    <div className={cn('rounded-xl border border-border/70 bg-card p-4', status === 'alterado' && 'border-status-warning/40 bg-status-warning/[0.03]')}>
      <div className="flex items-start gap-3">
        <Checkbox checked={selected} onCheckedChange={onToggleSelect} aria-label={`Selecionar ${f.nome}`} className="mt-1" />
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{initialsOf(f.nome)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{f.nome}</p>
          <p className="text-xs text-muted-foreground">{f.cpf || 'sem código'} · {f.setor?.nome || 'Sem setor'}</p>
          <OccurrenceStatusBadge status={status} />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Faltas</p>
          <QuantityStepper value={entry.faltas} previous={baselineEntry?.faltas} onChange={onChangeFaltas} onRestore={onRestore} label={`Faltas de ${f.nome}`} className="scale-110 origin-left" readOnly={!acesso.podeEditarCampo('faltas')} />
        </div>
        <div>
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Advertências</p>
          <QuantityStepper value={entry.advertencias} previous={baselineEntry?.advertencias} onChange={onChangeAdvertencias} onRestore={onRestore} label={`Advertências de ${f.nome}`} className="scale-110 origin-left" readOnly={!acesso.podeEditarCampo('advertencias')} />
        </div>
      </div>
    </div>
  );
}
