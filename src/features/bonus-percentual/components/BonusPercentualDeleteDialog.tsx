import { useState } from 'react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { pluralizeBR } from '@/lib/formatters';
import { canDeleteBonusPercentual, bonusPercentualProtectionReason } from '../domain/bonusPercentualProtecao';
import { vigenciaLabel } from './periodLabel';
import type { BonusPercentualRow } from '../types/bonus-percentual.types';

interface Props {
  row: BonusPercentualRow | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (r: BonusPercentualRow) => Promise<void>;
  onNovaVigencia: (r: BonusPercentualRow) => void;
}

/**
 * Exclusão protegida (soft). Regras históricas são bloqueadas; programadas e a
 * vigente podem ser excluídas enquanto o processamento não consumir esta tabela.
 */
export function BonusPercentualDeleteDialog({ row, onOpenChange, onConfirm, onNovaVigencia }: Props) {
  const [deleting, setDeleting] = useState(false);
  if (!row) return null;
  const bloqueado = !canDeleteBonusPercentual(row.state.state, row.usage);
  const motivo = bonusPercentualProtectionReason(row.state.state, row.usage);

  const handle = async () => {
    if (deleting || bloqueado) return;
    setDeleting(true);
    try { await onConfirm(row); onOpenChange(false); } finally { setDeleting(false); }
  };

  return (
    <AlertDialog open={!!row} onOpenChange={(o) => { if (!deleting) onOpenChange(o); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir configuração de bônus percentual</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p><strong>{vigenciaLabel(row)}</strong> · {row.state.label}</p>
              {bloqueado ? (
                <>
                  {row.usage.utilizada && <p>Remunerou {pluralizeBR(row.usage.competencias, 'competência', 'competências')} ({pluralizeBR(row.usage.resultados, 'resultado', 'resultados')}).</p>}
                  <p className="text-status-warning">{motivo}</p>
                </>
              ) : (
                <p>Configuração programada e não utilizada. A exclusão a desativará (soft-delete). Premiações já geradas não são afetadas.</p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>{bloqueado ? 'Fechar' : 'Cancelar'}</AlertDialogCancel>
          {bloqueado ? (
            <Button onClick={() => { onNovaVigencia(row); onOpenChange(false); }}>Criar nova vigência</Button>
          ) : (
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handle(); }} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
