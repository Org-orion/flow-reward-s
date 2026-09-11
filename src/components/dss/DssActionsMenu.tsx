import { useState } from 'react';
import { MoreHorizontal, Eye, Pencil, Copy, FileText, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useResourceAccess } from '@/hooks/useResourceAccess';

interface Props {
  titulo: string;
  onView: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onGenerateReport: () => void;
  onDelete: () => Promise<void> | void;
}

/** Menu de contexto do histórico. Excluir fica separado, com confirmação e bloqueio de duplo envio. */
export function DssActionsMenu({ titulo, onView, onEdit, onDuplicate, onGenerateReport, onDelete }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const acesso = useResourceAccess('dss');

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await onDelete();
      setConfirmOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Ações do DSS ${titulo}`}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={onView}><Eye className="mr-2 h-4 w-4" /> Ver detalhes</DropdownMenuItem>
          {acesso.podeEditar && <DropdownMenuItem onClick={onEdit}><Pencil className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>}
          {acesso.podeCriar && <DropdownMenuItem onClick={onDuplicate}><Copy className="mr-2 h-4 w-4" /> Duplicar como novo</DropdownMenuItem>}
          <DropdownMenuItem onClick={onGenerateReport}><FileText className="mr-2 h-4 w-4" /> Gerar relatório</DropdownMenuItem>
          {acesso.podeExcluir && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setConfirmOpen(true)} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Excluir
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={(o) => { if (!deleting) setConfirmOpen(o); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir DSS</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{titulo}</strong>? Esta ação remove o registro e a lista de
              presença permanentemente do banco de dados — não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
