import { MoreHorizontal, Eye, Link2, RefreshCw, Briefcase, ExternalLink, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { JobEmployeeRow } from '../types/job-employee.types';
import { useResourceAccess } from '@/hooks/useResourceAccess';

export interface EmployeeRowHandlers {
  onOpen: (r: JobEmployeeRow) => void;
  onAssign: (r: JobEmployeeRow) => void;
  onViewCargo: (r: JobEmployeeRow) => void;
  onOpenRh: (r: JobEmployeeRow) => void;
  onHistory: (r: JobEmployeeRow) => void;
}

interface Props {
  row: JobEmployeeRow;
  temCargos: boolean;
  handlers: EmployeeRowHandlers;
}

/** Menu contextual — nenhuma ação exposta na linha. Só ações funcionais. */
export function JobEmployeeActionsMenu({ row, temCargos, handlers }: Props) {
  const acesso = useResourceAccess('cs_funcionarios');
  const enquadrado = row.cargo != null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Ações de ${row.funcionario.nome}`}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => handlers.onOpen(row)}><Eye className="mr-2 h-4 w-4" /> Ver detalhes</DropdownMenuItem>
        {temCargos && (
          enquadrado
            ? acesso.podeEditar && <DropdownMenuItem onClick={() => handlers.onAssign(row)}><RefreshCw className="mr-2 h-4 w-4" /> Alterar cargo</DropdownMenuItem>
            : acesso.podeEditar && <DropdownMenuItem onClick={() => handlers.onAssign(row)}><Link2 className="mr-2 h-4 w-4" /> Vincular cargo</DropdownMenuItem>
        )}
        {enquadrado && <DropdownMenuItem onClick={() => handlers.onViewCargo(row)}><Briefcase className="mr-2 h-4 w-4" /> Ver cargo</DropdownMenuItem>}
        <DropdownMenuItem onClick={() => handlers.onHistory(row)}><History className="mr-2 h-4 w-4" /> Ver histórico</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handlers.onOpenRh(row)}><ExternalLink className="mr-2 h-4 w-4" /> Abrir cadastro no RH</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
