import { useState } from 'react';
import { MoreHorizontal, Eye, Users, GitCompareArrows, RefreshCw, FileBarChart2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatCurrencyBRL } from '@/lib/formatters';
import type { ProcessingRow } from '../types/rewards-processing.types';
import { useResourceAccess } from '@/hooks/useResourceAccess';

interface Props {
  row: ProcessingRow;
  competenciaLabel: string;
  onDetails: () => void;
  onEmployees: () => void;
  onCompare: () => void;
  onReprocess: () => void;
  onReport: () => void;
  onDelete: () => Promise<void> | void;
}

export function RewardsProcessingActionsMenu({ row, competenciaLabel, onDetails, onEmployees, onCompare, onReprocess, onReport, onDelete }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const acesso = useResourceAccess('gerar_premiacoes');
  const canDelete = !!row.baseId;

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try { await onDelete(); setConfirmOpen(false); } finally { setDeleting(false); }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Ações de ${row.baseNome} em ${competenciaLabel}`}><MoreHorizontal className="h-4 w-4" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={onDetails}><Eye className="mr-2 h-4 w-4" /> Ver detalhes</DropdownMenuItem>
          <DropdownMenuItem onClick={onEmployees}><Users className="mr-2 h-4 w-4" /> Ver funcionários</DropdownMenuItem>
          <DropdownMenuItem onClick={onCompare}><GitCompareArrows className="mr-2 h-4 w-4" /> Comparar com cálculo anterior</DropdownMenuItem>
          {acesso.pode('processar') && <DropdownMenuItem onClick={onReprocess}><RefreshCw className="mr-2 h-4 w-4" /> Reprocessar</DropdownMenuItem>}
          <DropdownMenuItem onClick={onReport}><FileBarChart2 className="mr-2 h-4 w-4" /> Abrir relatório</DropdownMenuItem>
          <DropdownMenuSeparator />
          {acesso.podeExcluir && <DropdownMenuItem onClick={() => setConfirmOpen(true)} disabled={!canDelete} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Excluir processamento</DropdownMenuItem>}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={(o) => { if (!deleting) setConfirmOpen(o); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir processamento</AlertDialogTitle>
            <AlertDialogDescription>
              Remover o processamento de <strong>{row.baseNome}</strong> em <strong>{competenciaLabel}</strong> exclui
              <strong> {row.resultados} resultado(s)</strong> ({formatCurrencyBRL(row.valorTotal)}) permanentemente.
              Os valores de premiação desses funcionários nesta competência deixarão de existir. Esta ação não pode ser desfeita.
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
