import { MoreHorizontal, Eye, Pencil, Users, BarChart3, TrendingUp, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useResourceAccess } from '@/hooks/useResourceAccess';

interface Props {
  setorNome: string;
  onDetails: () => void;
  onEdit: () => void;
  onFuncionarios: () => void;
  onProducao: () => void;
  onIndicadores: () => void;
  onDelete: () => void;
}

/** Menu de contexto do setor — editar/excluir não ficam expostos na linha. */
export function SectorActionsMenu({ setorNome, onDetails, onEdit, onFuncionarios, onProducao, onIndicadores, onDelete }: Props) {
  const isAdmin = useIsAdmin();
  const acesso = useResourceAccess('cad_setores');
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Ações de ${setorNome}`}><MoreHorizontal className="h-4 w-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={onDetails}><Eye className="mr-2 h-4 w-4" /> Ver detalhes</DropdownMenuItem>
        {acesso.podeEditar && <DropdownMenuItem onClick={onEdit}><Pencil className="mr-2 h-4 w-4" /> Editar setor</DropdownMenuItem>}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onFuncionarios}><Users className="mr-2 h-4 w-4" /> Ver funcionários</DropdownMenuItem>
        <DropdownMenuItem onClick={onProducao}><BarChart3 className="mr-2 h-4 w-4" /> Ver produção do setor</DropdownMenuItem>
        <DropdownMenuItem onClick={onIndicadores}><TrendingUp className="mr-2 h-4 w-4" /> Ver indicadores do setor</DropdownMenuItem>
        {isAdmin && acesso.podeExcluir && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Excluir setor</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
