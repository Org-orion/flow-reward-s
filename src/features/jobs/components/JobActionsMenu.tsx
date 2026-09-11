import { MoreHorizontal, Eye, Pencil, Users, Wallet, Power, PowerOff, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import type { JobRow } from '../types/job.types';
import { useResourceAccess } from '@/hooks/useResourceAccess';

export interface JobRowHandlers {
  onOpen: (r: JobRow) => void;
  onEdit: (r: JobRow) => void;
  onViewEmployees: (r: JobRow) => void;
  onManageSalary: (r: JobRow) => void;
  onActivate: (r: JobRow) => void;
  onDeactivate: (r: JobRow) => void;
  onDelete: (r: JobRow) => void;
}

interface Props {
  row: JobRow;
  autorizadoSalario: boolean;
  handlers: JobRowHandlers;
}

/**
 * Menu contextual — nenhuma ação destrutiva exposta na linha. Só ações
 * funcionais e autorizadas aparecem. Gerenciar faixa exige autorização salarial.
 */
export function JobActionsMenu({ row, autorizadoSalario, handlers }: Props) {
  const ativo = row.cargo.ativo;
  const isAdmin = useIsAdmin();
  const acesso = useResourceAccess('cs_cargos');
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Ações de ${row.cargo.nome}`}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={() => handlers.onOpen(row)}><Eye className="mr-2 h-4 w-4" /> Ver detalhes</DropdownMenuItem>
        {acesso.podeEditar && <DropdownMenuItem onClick={() => handlers.onEdit(row)}><Pencil className="mr-2 h-4 w-4" /> Editar cargo</DropdownMenuItem>}
        <DropdownMenuItem onClick={() => handlers.onViewEmployees(row)}><Users className="mr-2 h-4 w-4" /> Ver colaboradores</DropdownMenuItem>
        {autorizadoSalario && acesso.podeEditar && (
          <DropdownMenuItem onClick={() => handlers.onManageSalary(row)}><Wallet className="mr-2 h-4 w-4" /> Gerenciar faixa</DropdownMenuItem>
        )}
        {(acesso.podeEditar || isAdmin) && <DropdownMenuSeparator />}
        {acesso.podeEditar && (ativo ? (
          <DropdownMenuItem onClick={() => handlers.onDeactivate(row)}><PowerOff className="mr-2 h-4 w-4" /> Inativar</DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => handlers.onActivate(row)}><Power className="mr-2 h-4 w-4" /> Reativar</DropdownMenuItem>
        ))}
        {isAdmin && (
          <DropdownMenuItem onClick={() => handlers.onDelete(row)} className="text-destructive focus:text-destructive">
            <Trash2 className="mr-2 h-4 w-4" /> Excluir
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
