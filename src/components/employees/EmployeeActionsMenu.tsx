import { useState } from 'react';
import { MoreHorizontal, Eye, Pencil, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Funcionario } from '@/hooks/useFuncionarios';
import { useResourceAccess } from '@/hooks/useResourceAccess';

interface EmployeeActionsMenuProps {
  funcionario: Funcionario;
  onView: () => void;
  onEdit: () => void;
  onInactivate: () => void;
}

/**
 * Menu de contexto por linha. A ação destrutiva (Inativar) fica separada,
 * exige confirmação e explica o impacto real: o cadastro NÃO é excluído do
 * banco — apenas marcado como inativo (ativo=false, status="Rescisão"), o que
 * já é o comportamento existente de deleteFuncionario. Não há exclusão
 * permanente disponível hoje — por isso o menu não a oferece.
 */
export function EmployeeActionsMenu({ funcionario, onView, onEdit, onInactivate }: EmployeeActionsMenuProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const acesso = useResourceAccess('funcionarios');

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Ações do funcionário">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={onView}><Eye className="mr-2 h-4 w-4" /> Ver perfil</DropdownMenuItem>
          {acesso.podeEditar && <DropdownMenuItem onClick={onEdit}><Pencil className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>}
          {funcionario.ativo && acesso.podeEditar && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setConfirmOpen(true)} className="text-destructive focus:text-destructive">
                <UserX className="mr-2 h-4 w-4" /> Inativar
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Inativar funcionário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja inativar <strong>{funcionario.nome}</strong>? O status muda para
              "Rescisão" e o cadastro deixa de participar da premiação e das telas operacionais.
              O registro não é excluído do banco e pode ser reativado depois pela edição.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={onInactivate} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Inativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
