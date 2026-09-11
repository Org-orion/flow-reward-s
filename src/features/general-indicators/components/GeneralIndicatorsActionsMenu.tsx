import { useState } from 'react';
import { MoreHorizontal, Eye, Pencil, GitCompareArrows, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Props {
  indicadorLabel: string;
  competenciaLabel: string;
  onView: () => void;
  onEdit: () => void;
  onCompare: () => void;
  onDelete: () => Promise<void> | void;
  /** Permissões (ver src/config/permissions.ts). */
  podeEditar?: boolean;
  podeExcluir?: boolean;
}

/** Menu de contexto do histórico. Excluir é separado, perigoso, com confirmação e bloqueio de duplo envio. */
export function GeneralIndicatorsActionsMenu({
  indicadorLabel, competenciaLabel, onView, onEdit, onCompare, onDelete,
  podeEditar = true, podeExcluir = true,
}: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Ações de ${indicadorLabel} em ${competenciaLabel}`}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={onView}><Eye className="mr-2 h-4 w-4" /> Ver detalhes</DropdownMenuItem>
          {podeEditar && <DropdownMenuItem onClick={onEdit}><Pencil className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>}
          <DropdownMenuItem onClick={onCompare}><GitCompareArrows className="mr-2 h-4 w-4" /> Comparar</DropdownMenuItem>
          {podeExcluir && (
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
            <AlertDialogTitle>Excluir registro do indicador</AlertDialogTitle>
            <AlertDialogDescription>
              Excluir <strong>{indicadorLabel}</strong> de <strong>{competenciaLabel}</strong> remove o dado permanentemente.
              Indicadores como Faturamento e Quantidade de Kits alimentam o cálculo de premiação da competência. Esta ação não pode ser desfeita.
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
