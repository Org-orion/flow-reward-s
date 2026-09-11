import { MoreHorizontal, Eye, Pencil, Share2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useResourceAccess } from '@/hooks/useResourceAccess';

interface Props {
  faixaNome: string;
  onDetails: () => void;
  onEdit: () => void;
  onVinculos: () => void;
  onDelete: () => void;
}

export function BonusTierActionsMenu({ faixaNome, onDetails, onEdit, onVinculos, onDelete }: Props) {
  const isAdmin = useIsAdmin();
  const acesso = useResourceAccess('cad_faixas');
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Ações da faixa ${faixaNome}`}><MoreHorizontal className="h-4 w-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={onDetails}><Eye className="mr-2 h-4 w-4" /> Ver detalhes</DropdownMenuItem>
        {acesso.podeEditar && <DropdownMenuItem onClick={onEdit}><Pencil className="mr-2 h-4 w-4" /> Editar faixa</DropdownMenuItem>}
        <DropdownMenuItem onClick={onVinculos}><Share2 className="mr-2 h-4 w-4" /> Ver vínculos</DropdownMenuItem>
        {isAdmin && acesso.podeExcluir && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Excluir faixa</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
