import { MoreHorizontal, Eye, Pencil, LineChart, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useResourceAccess } from '@/hooks/useResourceAccess';

interface Props {
  nome: string;
  temMedicoes: boolean;
  onDetails: () => void;
  onEdit: () => void;
  onVerMedicoes: () => void;
  onDelete: () => void;
}

export function IndicatorTypeActionsMenu({ nome, temMedicoes, onDetails, onEdit, onVerMedicoes, onDelete }: Props) {
  const isAdmin = useIsAdmin();
  const acesso = useResourceAccess('cad_tipos_indicadores');
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Ações do indicador ${nome}`}><MoreHorizontal className="h-4 w-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={onDetails}><Eye className="mr-2 h-4 w-4" /> Ver detalhes</DropdownMenuItem>
        {acesso.podeEditar && <DropdownMenuItem onClick={onEdit}><Pencil className="mr-2 h-4 w-4" /> Editar indicador</DropdownMenuItem>}
        {temMedicoes && <DropdownMenuItem onClick={onVerMedicoes}><LineChart className="mr-2 h-4 w-4" /> Ver medições</DropdownMenuItem>}
        {isAdmin && acesso.podeExcluir && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Excluir indicador</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
