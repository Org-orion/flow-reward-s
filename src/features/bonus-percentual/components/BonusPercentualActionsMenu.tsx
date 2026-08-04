import { MoreHorizontal, Eye, Calculator, Pencil, CalendarPlus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useIsAdmin } from '@/hooks/useIsAdmin';

interface Props {
  canEdit: boolean;
  canDelete: boolean;
  onDetails: () => void;
  onSimular: () => void;
  onEdit: () => void;
  onNovaVigencia: () => void;
  onDelete: () => void;
}

export function BonusPercentualActionsMenu({ canEdit, canDelete, onDetails, onSimular, onEdit, onNovaVigencia, onDelete }: Props) {
  const isAdmin = useIsAdmin();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Ações da configuração"><MoreHorizontal className="h-4 w-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={onDetails}><Eye className="mr-2 h-4 w-4" /> Ver detalhes</DropdownMenuItem>
        <DropdownMenuItem onClick={onSimular}><Calculator className="mr-2 h-4 w-4" /> Simular</DropdownMenuItem>
        <DropdownMenuItem onClick={onNovaVigencia}><CalendarPlus className="mr-2 h-4 w-4" /> Criar nova vigência</DropdownMenuItem>
        {canEdit && <DropdownMenuItem onClick={onEdit}><Pencil className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>}
        {canDelete && isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Excluir</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
