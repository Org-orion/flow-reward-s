import { MoreHorizontal, Eye, Pencil, Network, Users, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useResourceAccess } from '@/hooks/useResourceAccess';

interface Props {
  empresaNome: string;
  onDetails: () => void;
  onEdit: () => void;
  onVerSetores: () => void;
  onVerFuncionarios: () => void;
  onDelete: () => void;
}

export function CompanyActionsMenu({ empresaNome, onDetails, onEdit, onVerSetores, onVerFuncionarios, onDelete }: Props) {
  const isAdmin = useIsAdmin();
  const acesso = useResourceAccess('cad_empresas');
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Ações da empresa ${empresaNome}`}><MoreHorizontal className="h-4 w-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={onDetails}><Eye className="mr-2 h-4 w-4" /> Ver detalhes</DropdownMenuItem>
        {acesso.podeEditar && <DropdownMenuItem onClick={onEdit}><Pencil className="mr-2 h-4 w-4" /> Editar empresa</DropdownMenuItem>}
        <DropdownMenuItem onClick={onVerSetores}><Network className="mr-2 h-4 w-4" /> Ver setores</DropdownMenuItem>
        <DropdownMenuItem onClick={onVerFuncionarios}><Users className="mr-2 h-4 w-4" /> Ver funcionários</DropdownMenuItem>
        {isAdmin && acesso.podeExcluir && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Excluir empresa</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
