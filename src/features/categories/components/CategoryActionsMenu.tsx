import { MoreHorizontal, Eye, Pencil, Users, Award, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useResourceAccess } from '@/hooks/useResourceAccess';

interface Props {
  categoriaNome: string;
  temPremiacao: boolean;
  onDetails: () => void;
  onEdit: () => void;
  onVerFuncionarios: () => void;
  onVerPremiacao: () => void;
  onDelete: () => void;
}

export function CategoryActionsMenu({ categoriaNome, temPremiacao, onDetails, onEdit, onVerFuncionarios, onVerPremiacao, onDelete }: Props) {
  const isAdmin = useIsAdmin();
  const acesso = useResourceAccess('cad_categorias');
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Ações da categoria ${categoriaNome}`}><MoreHorizontal className="h-4 w-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={onDetails}><Eye className="mr-2 h-4 w-4" /> Ver detalhes</DropdownMenuItem>
        {acesso.podeEditar && <DropdownMenuItem onClick={onEdit}><Pencil className="mr-2 h-4 w-4" /> Editar categoria</DropdownMenuItem>}
        <DropdownMenuItem onClick={onVerFuncionarios}><Users className="mr-2 h-4 w-4" /> Ver funcionários</DropdownMenuItem>
        {temPremiacao && <DropdownMenuItem onClick={onVerPremiacao}><Award className="mr-2 h-4 w-4" /> Ver vínculos de premiação</DropdownMenuItem>}
        {isAdmin && acesso.podeExcluir && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Excluir categoria</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
