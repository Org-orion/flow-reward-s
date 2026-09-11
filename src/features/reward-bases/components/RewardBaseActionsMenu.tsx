import { MoreHorizontal, Eye, Pencil, Share2, Settings2, FileBarChart, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useResourceAccess } from '@/hooks/useResourceAccess';

interface Props {
  baseNome: string;
  isKits: boolean;
  onDetails: () => void;
  onEdit: () => void;
  onVinculos: () => void;
  onConfiguracoes: () => void;
  onProcessamentos: () => void;
  onDelete: () => void;
}

export function RewardBaseActionsMenu({ baseNome, isKits, onDetails, onEdit, onVinculos, onConfiguracoes, onProcessamentos, onDelete }: Props) {
  const isAdmin = useIsAdmin();
  const acesso = useResourceAccess('cad_base_premiacao');
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Ações da base ${baseNome}`}><MoreHorizontal className="h-4 w-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={onDetails}><Eye className="mr-2 h-4 w-4" /> Ver detalhes</DropdownMenuItem>
        {acesso.podeEditar && <DropdownMenuItem onClick={onEdit}><Pencil className="mr-2 h-4 w-4" /> Editar base</DropdownMenuItem>}
        <DropdownMenuItem onClick={onVinculos}><Share2 className="mr-2 h-4 w-4" /> Ver vínculos</DropdownMenuItem>
        {isKits && <DropdownMenuItem onClick={onConfiguracoes}><Settings2 className="mr-2 h-4 w-4" /> Ver configurações de kits</DropdownMenuItem>}
        <DropdownMenuItem onClick={onProcessamentos}><FileBarChart className="mr-2 h-4 w-4" /> Ver processamentos</DropdownMenuItem>
        {isAdmin && acesso.podeExcluir && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Excluir base</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
