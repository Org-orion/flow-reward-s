import { TableCell, TableRow } from '@/components/ui/table';
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

export function OccurrenceEmployeeRow({
  funcionario: f, entry, baselineEntry, status, selected, onToggleSelect, onChangeFaltas, onChangeAdvertencias, onRestore,
}: Props) {
  const acesso = useResourceAccess('faltas_advertencias');
  return (
    <TableRow className={cn(status === 'alterado' && 'bg-status-warning/[0.04]', status === 'erro' && 'bg-destructive/[0.04]')}>
      <TableCell className="w-10">
        <Checkbox checked={selected} onCheckedChange={onToggleSelect} aria-label={`Selecionar ${f.nome}`} />
      </TableCell>

      <TableCell>
        <div className="flex items-center gap-2.5">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">{initialsOf(f.nome)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{f.nome}</p>
            <p className="text-xs text-muted-foreground">{f.cpf || 'sem código'} · {f.funcao?.nome || 'sem função'}</p>
          </div>
        </div>
      </TableCell>

      <TableCell>
        {f.setor?.nome
          ? <span className="text-sm text-foreground">{f.setor.nome}</span>
          : <span className="text-sm font-medium text-destructive">Sem setor</span>}
      </TableCell>

      <TableCell>
        <QuantityStepper
          value={entry.faltas}
          previous={baselineEntry?.faltas}
          onChange={onChangeFaltas}
          onRestore={onRestore}
          label={`Faltas de ${f.nome}`}
          readOnly={!acesso.podeEditarCampo('faltas')}
        />
      </TableCell>

      <TableCell>
        <QuantityStepper
          value={entry.advertencias}
          previous={baselineEntry?.advertencias}
          onChange={onChangeAdvertencias}
          onRestore={onRestore}
          label={`Advertências de ${f.nome}`}
          readOnly={!acesso.podeEditarCampo('advertencias')}
        />
      </TableCell>

      <TableCell><OccurrenceStatusBadge status={status} /></TableCell>
    </TableRow>
  );
}
