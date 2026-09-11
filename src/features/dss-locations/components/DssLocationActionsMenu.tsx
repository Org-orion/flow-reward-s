import { MoreHorizontal, Eye, Pencil, Users, ClipboardEdit, History, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useResourceAccess } from '@/hooks/useResourceAccess';

interface Props {
  nome: string;
  temFuncionarios: boolean;
  temHistorico: boolean;
  onDetails: () => void;
  onEdit: () => void;
  onVerFuncionarios: () => void;
  onRegistrarDss: () => void;
  onVerHistorico: () => void;
  onDelete: () => void;
}

export function DssLocationActionsMenu({ nome, temFuncionarios, temHistorico, onDetails, onEdit, onVerFuncionarios, onRegistrarDss, onVerHistorico, onDelete }: Props) {
  const isAdmin = useIsAdmin();
  const acesso = useResourceAccess('cad_locais_dss');
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Ações do local ${nome}`}><MoreHorizontal className="h-4 w-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={onDetails}><Eye className="mr-2 h-4 w-4" /> Ver detalhes</DropdownMenuItem>
        {acesso.podeEditar && <DropdownMenuItem onClick={onEdit}><Pencil className="mr-2 h-4 w-4" /> Editar local</DropdownMenuItem>}
        {temFuncionarios && <DropdownMenuItem onClick={onVerFuncionarios}><Users className="mr-2 h-4 w-4" /> Ver funcionários</DropdownMenuItem>}
        <DropdownMenuItem onClick={onRegistrarDss}><ClipboardEdit className="mr-2 h-4 w-4" /> Registrar novo DSS</DropdownMenuItem>
        {temHistorico && <DropdownMenuItem onClick={onVerHistorico}><History className="mr-2 h-4 w-4" /> Ver histórico de DSS</DropdownMenuItem>}
        {isAdmin && acesso.podeExcluir && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Excluir local</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
