import { MoreHorizontal, Eye, Pencil, Users, GitCompare, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useResourceAccess } from '@/hooks/useResourceAccess';

interface Props {
  funcaoNome: string;
  temCorrespondencia: boolean;
  onDetails: () => void;
  onEdit: () => void;
  onVerFuncionarios: () => void;
  onCompare: () => void;
  onDelete: () => void;
}

export function FunctionActionsMenu({ funcaoNome, temCorrespondencia, onDetails, onEdit, onVerFuncionarios, onCompare, onDelete }: Props) {
  const isAdmin = useIsAdmin();
  const acesso = useResourceAccess('cad_funcoes');
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Ações da função ${funcaoNome}`}><MoreHorizontal className="h-4 w-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={onDetails}><Eye className="mr-2 h-4 w-4" /> Ver detalhes</DropdownMenuItem>
        {acesso.podeEditar && <DropdownMenuItem onClick={onEdit}><Pencil className="mr-2 h-4 w-4" /> Editar função</DropdownMenuItem>}
        <DropdownMenuItem onClick={onVerFuncionarios}><Users className="mr-2 h-4 w-4" /> Ver funcionários</DropdownMenuItem>
        {temCorrespondencia && <DropdownMenuItem onClick={onCompare}><GitCompare className="mr-2 h-4 w-4" /> Comparar nomenclatura</DropdownMenuItem>}
        {isAdmin && acesso.podeExcluir && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Excluir função</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
